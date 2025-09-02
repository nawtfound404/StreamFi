// Blockchain & NFT (stubs)
export type MintRequest = { to: string; type: "badge" | "collectible"; metadata: Record<string, unknown> };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

async function postToApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return res.json() as Promise<T>;
}

async function fetchFromApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
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
  async listOwned(address: string) {
    const data = await fetchFromApi<{ items: { tokenId: string; tokenURI: string }[] }>(
      `/monetization/nft/owner/${address}`
    );
    return data?.items ?? [];
  },
};
