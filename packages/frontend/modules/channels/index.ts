import { api, API_BASE } from '@/lib/api';

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
    const body: any = { streamId, depositWei: depositWei.toString(), ...(addr ? { viewer: addr } : {}) };
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
