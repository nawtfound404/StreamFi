// Donation & Monetization
export type Donation = {
  id: string
  amount: number
  currency: string
  from: string
  message?: string
  time: string // ISO
}

// NFTSale type and flows removed

export type Payout = {
  id: string
  amount: number
  currency: string
  status: "pending" | "paid" | "failed"
  time: string // ISO
}

function iso(offsetMinutes: number) {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString()
}

const demoDonations: Donation[] = [
  { id: "d1", from: "alice", amount: 10, currency: "USD", time: iso(5), message: "Great stream!" },
  { id: "d2", from: "bob", amount: 5, currency: "USD", time: iso(45) },
  { id: "d3", from: "charlie", amount: 25, currency: "USD", time: iso(180), message: "Keep it up" },
  { id: "d4", from: "diana", amount: 2, currency: "USD", time: iso(1440) },
]

// const demoNFTs = [] as const;

const demoPayouts: Payout[] = [
  { id: "p1", amount: 42, currency: "USD", status: "pending", time: iso(120) },
  { id: "p2", amount: 120, currency: "USD", status: "paid", time: iso(4320) },
]

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api'

async function fetchFromApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) return null
    const data = (await res.json()) as T
    return data
  } catch {
    return null
  }
}

export const monetization = {
  async donate(d: Omit<Donation, "id" | "time">) {
    // TODO: integrate Stripe/UPI/PayPal
    void d
    return { ok: true }
  },
  async upiIntent(amount: number, currency = 'INR', streamId?: string, userId?: string) {
  const tokenRes = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
  const csrfToken = tokenRes.ok ? (await tokenRes.json()).csrfToken as string : undefined;
  const res = await fetch(`${API_BASE}/payments/upi/intent`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) }, body: JSON.stringify({ amount, currency, streamId, userId }) });
    if (!res.ok) throw new Error('UPI intent failed');
    return res.json() as Promise<{ intentId: string; deeplink: string }>;
  },
  async paypalIntent(amount: number, currency = 'USD', streamId?: string, userId?: string) {
  const tokenRes = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
  const csrfToken = tokenRes.ok ? (await tokenRes.json()).csrfToken as string : undefined;
  const res = await fetch(`${API_BASE}/payments/paypal/intent`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) }, body: JSON.stringify({ amount, currency, streamId, userId }) });
    if (!res.ok) throw new Error('PayPal intent failed');
    return res.json() as Promise<{ orderId: string; approveUrl: string }>;
  },
  async createPayout(amount: number, currency = 'USD', note?: string) {
    const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
  const tokenRes = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
  const csrfToken = tokenRes.ok ? (await tokenRes.json()).csrfToken as string : undefined;
  const res = await fetch(`${API_BASE}/monetization/payouts`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) }, body: JSON.stringify({ amount, currency, note }) });
    if (!res.ok) throw new Error('Create payout failed');
    return res.json();
  },
  async getDonations() {
    const api = await fetchFromApi<Donation[]>(`/monetization/donations`)
    return api ?? demoDonations
  },
  // getNFTSales removed
  async getPayouts() {
    const api = await fetchFromApi<Payout[]>(`/monetization/payouts`)
    return api ?? demoPayouts
  },
  async getSummary() {
    // Try API first
  const api = await fetchFromApi<{ totalDonationsUSD: number; totalNftSales?: number; payoutsPendingUSD: number; sparkline: number[] }>(`/monetization/summary`)
    if (api) return api
    // Fallback to demo aggregates
    const totalDonations = demoDonations.reduce((s, d) => s + d.amount, 0)
  const totalNftUsdEstimate = 0
    const payoutsPending = demoPayouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0)
    return {
      totalDonationsUSD: totalDonations,
  totalNftSales: totalNftUsdEstimate,
      payoutsPendingUSD: payoutsPending,
      sparkline: [10, 12, 8, 14, 18, 16, 20],
    }
  },
}

export async function createStripeDonation(amount: number, currency = 'USD') {
  const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
  const prefix = base.endsWith('/api') ? base : `${base}/api`;
  const res = await fetch(`${prefix}/payments/stripe/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency }),
  });
  if (!res.ok) throw new Error('Failed to create payment');
  return res.json() as Promise<{ clientSecret: string | null }>; 
}
