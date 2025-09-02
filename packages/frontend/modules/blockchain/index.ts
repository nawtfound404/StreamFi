// Blockchain & NFT (stubs)
export type MintRequest = { to: string; type: "badge" | "collectible"; metadata: Record<string, unknown> };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

function getAuthHeaders(): Record<string, string> {
  try {
    const token = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token as string | undefined) : undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function postToApi<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...getAuthHeaders() };
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return res.json() as Promise<T>;
}

async function fetchFromApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: getAuthHeaders() as Record<string,string> });
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json() as Promise<T>;
}

export const blockchain = {
  async mintNFT(req: MintRequest) {
    const to = req.to;
    const res = await postToApi<{ ok: boolean; tokenId: string }>("/monetization/nft/mint", {
      toWallet: to,
    });
    return res;
  },
  async getToken(tokenId: string | number) {
    const data = await fetchFromApi<{ tokenId: string; owner: string; tokenURI: string }>(
      `/monetization/nft/${tokenId}`
    );
    return data;
  },
  async getTokenMetadata(tokenId: string | number) {
    const data = await fetchFromApi<{ tokenId: string; tokenURI: string; metadata: any }>(
      `/monetization/nft/${tokenId}/metadata`
    );
    return data;
  },
  async listOwnedPage(address: string, opts?: { cursor?: string | null; limit?: number }) {
    const q: string[] = [];
    if (opts?.limit) q.push(`limit=${encodeURIComponent(String(opts.limit))}`);
    if (opts?.cursor) q.push(`cursor=${encodeURIComponent(String(opts.cursor))}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    const data = await fetchFromApi<{ items: { tokenId: string; tokenURI: string }[]; nextCursor: string | null }>(
      `/monetization/nft/owner/${address}${qs}`
    );
    return data;
  },
  async listOwned(address: string) {
    const data = await fetchFromApi<{ items: { tokenId: string; tokenURI: string }[]; nextCursor?: string | null }>(
      `/monetization/nft/owner/${address}`
    );
    return data?.items ?? [];
  },
};
