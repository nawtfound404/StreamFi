const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

type Order = {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
};

function authHeaders(): Record<string,string> {
  try {
    const token = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token as string | undefined) : undefined;
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
}

export const yellow = {
  async market(symbol: string) {
    const res = await fetch(`${API_BASE}/yellow/markets/${encodeURIComponent(symbol)}`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) throw new Error('Market fetch failed');
    return res.json();
  },
  async placeOrder(order: Order) {
  const csrfRes = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
  const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
  const res = await fetch(`${API_BASE}/yellow/orders`, { method: 'POST', headers: { ...authHeaders(), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) }, credentials: 'include', body: JSON.stringify(order) });
    if (!res.ok) throw new Error('Order failed');
    return res.json();
  }
};
