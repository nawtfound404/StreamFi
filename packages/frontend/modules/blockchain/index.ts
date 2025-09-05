// Blockchain helpers for wallet deposit/spend/settle
export type MintRequest = never;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

function getAuthHeaders(): Record<string, string> {
  try {
    const token = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token as string | undefined) : undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function postToApi<T>(path: string, body: unknown): Promise<T> {
  const csrfRes = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
  const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) };
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return res.json() as Promise<T>;
}

export const blockchain = {
  // Deposit off-chain balance for a stream
  async deposit(streamId: string, amount: number, token?: string) {
    return postToApi<{ _id?: string; userId: string; streamId: string; deposited: number; spent: number; token: string }>(
      `/monetization/deposit`,
      { streamId, amount, token }
    );
  },
  // Settle at end of stream to get remaining for refund
  async settle(streamId: string) {
    return postToApi<{ remaining: number; token: string }>(`/monetization/settle`, { streamId });
  },
};
