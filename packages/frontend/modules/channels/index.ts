import { api, API_BASE } from '@/lib/api';
import { createWalletClient, createPublicClient, custom, http, type Address, keccak256, toHex, getAddress, defineChain } from 'viem';

interface OpenChannelResponse {
  channelId: string;
  minTipWei: string | number;
  minDepositWei?: string | number;
  chainId: number;
  contract?: string;
  reused?: boolean;
  txHash?: string | null;
}

interface CloseChannelResponse {
  ok: boolean;
  channelId: string;
  deposited: string;
  vaultId: string;
  settlementTx?: string | null;
  skippedOnchain?: boolean;
  alreadyClosed?: boolean;
  onchainError?: string;
}

export const channels = {
  async init(streamId: string) {
    const token = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token as string | undefined) : undefined;
    const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const r = await fetch(`${API_BASE}/channels/stream/${encodeURIComponent(streamId)}/init`, { headers, credentials: 'include' });
    if (!r.ok) throw new Error(`init failed: ${r.status} ${await r.text()}`);
    return r.json();
  },
  async open(streamId: string, depositWei: bigint) : Promise<OpenChannelResponse> {
    // Use viewer override from wallet if available
    const addr = typeof window !== 'undefined' ? (await (async()=>{
      try { return (await (window as any).ethereum?.request?.({ method:'eth_accounts' }))?.[0] ?? undefined; } catch { return undefined; }
    })()) : undefined;
    const token = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token as string | undefined) : undefined;
    const csrf = await getCsrfToken();
    const headers: Record<string,string> = {
      'Content-Type': 'application/json',
      ...(addr ? { 'x-viewer-address': addr } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    };
    // Attempt viewer-led on-chain open when wallet is present and feature flag enabled
    let viewerTxHash: string | undefined;
    const wantOnchain = (process.env.NEXT_PUBLIC_ONCHAIN_OPEN ?? 'true').toLowerCase() === 'true';
    if (addr && wantOnchain && typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // Fetch init to get contract, chainId, vaultId
        const init = await channels.init(streamId);
        const chainId = Number(init.chainId);
        // Ensure chain matches
        const current = await (window as any).ethereum.request({ method: 'eth_chainId' });
        const currentId = typeof current === 'string' ? parseInt(current, 16) : Number(current);
        if (currentId !== chainId) {
          try { await (window as any).ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + chainId.toString(16) }] }); }
          catch (_) { /* ignore; user may switch manually */ }
        }
        // Build a dynamic viem chain descriptor to avoid hard-coding sepolia
        const dynamicChain = defineChain({ id: chainId, name: `chain-${chainId}` as any, nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [''] } }, formatters: undefined });
        const wallet = createWalletClient({ chain: dynamicChain, transport: custom((window as any).ethereum) });
        // Prefer the wallet provider for reading too (avoids CORS on http RPC)
        const pub = createPublicClient({ chain: dynamicChain, transport: custom((window as any).ethereum) });
        const accounts = await wallet.getAddresses();
        const viewer = (accounts?.[0] ? getAddress(accounts[0] as Address) : getAddress(addr as Address)) as Address;
        const cmAbi = [
          { type: 'function', name: 'openChannel', stateMutability: 'payable', inputs: [
            { name: 'viewer', type: 'address' },
            { name: 'streamIdHash', type: 'bytes32' },
            { name: 'vaultId', type: 'uint256' }
          ], outputs: [ { name: 'channelId', type: 'bytes32' } ] },
        ] as const;
        const streamIdHash = keccak256(toHex(streamId));
        const txHash = await wallet.writeContract({
          account: viewer,
          address: (init.channelContract || init.contract) as Address,
          abi: cmAbi,
          functionName: 'openChannel',
          args: [viewer, streamIdHash, BigInt(init.vaultId)],
          value: depositWei,
        });
        // Wait 1 confirmation to avoid race on backend validation
        const rc = await pub.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
        if (rc.status === 'success') viewerTxHash = txHash;
      } catch (e) {
        // Fall back to server-funded open if viewer tx fails
        // console.warn('viewer on-chain open failed; falling back', e);
      }
    }
    const body: any = { streamId, depositWei: depositWei.toString(), ...(addr ? { viewer: addr } : {}), ...(viewerTxHash ? { viewerTxHash } : {}) };
    const r = await fetch(`${API_BASE}/channels/open`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`open failed: ${r.status} ${await r.text()}`);
    return r.json();
  },
  async get(channelId: string) {
  return api<any>(`/api/channels/${encodeURIComponent(channelId)}`);
  },
  async tip(params: { channelId: string; newSpentWei: bigint; nonce: number; signature: string; message?: string }) {
    const addr = typeof window !== 'undefined' ? (await (async()=>{
      try { return (await (window as any).ethereum?.request?.({ method:'eth_accounts' }))?.[0] ?? undefined; } catch { return undefined; }
    })()) : undefined;
    const token = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token as string | undefined) : undefined;
    const csrf = await getCsrfToken();
    const headers: Record<string,string> = {
      'Content-Type': 'application/json',
      ...(addr ? { 'x-viewer-address': addr } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    };
    const body: any = { newSpentWei: params.newSpentWei.toString(), nonce: params.nonce, signature: params.signature, message: params.message, ...(addr ? { viewer: addr } : {}) };
  const r = await fetch(`${API_BASE}/channels/${encodeURIComponent(params.channelId)}/tip`, { method:'POST', headers, credentials:'include', body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`tip failed: ${r.status} ${await r.text()}`);
    return r.json();
  },
  async close(channelId: string): Promise<CloseChannelResponse> {
    const token = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token as string | undefined) : undefined;
    const csrf = await getCsrfToken();
    const headers: Record<string,string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    };
  const r = await fetch(`${API_BASE}/channels/${encodeURIComponent(channelId)}/close`, { method:'POST', headers, credentials:'include' });
  if (!r.ok) throw new Error(`close failed: ${r.status} ${await r.text()}`);
  return r.json();
  }
};

export interface ChannelStateSignInput {
  channelId: string;
  vaultId: bigint;
  viewer: string;
  deposit: bigint;
  spent: bigint;
  nonce: bigint;
}

export function channelTypedData(domain: { name: string; version: string; chainId: number; verifyingContract: string }, state: ChannelStateSignInput) {
  return JSON.stringify({
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      ChannelState: [
        { name: 'channelId', type: 'bytes32' },
        { name: 'vaultId', type: 'uint256' },
        { name: 'viewer', type: 'address' },
        { name: 'deposit', type: 'uint256' },
        { name: 'spent', type: 'uint256' },
        { name: 'nonce', type: 'uint64' },
      ],
    },
    primaryType: 'ChannelState',
    domain,
    message: state,
  });
}

async function getCsrfToken(): Promise<string | null> {
  try {
  const base = API_BASE;
    const res = await fetch(`${base}/csrf`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { csrfToken?: string };
    return data?.csrfToken || res.headers.get('x-csrf-token');
  } catch { return null; }
}
