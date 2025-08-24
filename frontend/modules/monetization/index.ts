// Donation & Monetization
export type Donation = {
  id: string
  amount: number
  currency: string
  from: string
  message?: string
  time: string // ISO
}

export type NFTSale = {
  id: string
  tokenId: string
  title: string
  price: number
  currency: string
  buyer: string
  txHash: string
  time: string // ISO
}

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

const demoNFTs: NFTSale[] = [
  { id: "n1", tokenId: "#1024", title: "Stream Moment 1", price: 0.02, currency: "ETH", buyer: "0xAbc…123", txHash: "0xdeadbeef", time: iso(60) },
  { id: "n2", tokenId: "#1025", title: "Stream Moment 2", price: 0.05, currency: "ETH", buyer: "0xF00…bAr", txHash: "0xcafebabe", time: iso(2880) },
]

const demoPayouts: Payout[] = [
  { id: "p1", amount: 42, currency: "USD", status: "pending", time: iso(120) },
  { id: "p2", amount: 120, currency: "USD", status: "paid", time: iso(4320) },
]

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

async function fetchFromApi<T>(path: string): Promise<T | null> {
  if (!API_BASE) return null
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
  async getDonations() {
    const api = await fetchFromApi<Donation[]>(`/monetization/donations`)
    return api ?? demoDonations
  },
  async getNFTSales() {
    const api = await fetchFromApi<NFTSale[]>(`/monetization/nfts`)
    return api ?? demoNFTs
  },
  async getPayouts() {
    const api = await fetchFromApi<Payout[]>(`/monetization/payouts`)
    return api ?? demoPayouts
  },
  async getSummary() {
    // Try API first
    const api = await fetchFromApi<{ totalDonationsUSD: number; totalNftSales: number; payoutsPendingUSD: number; sparkline: number[] }>(`/monetization/summary`)
    if (api) return api
    // Fallback to demo aggregates
    const totalDonations = demoDonations.reduce((s, d) => s + d.amount, 0)
    const totalNftUsdEstimate = demoNFTs.reduce((s, n) => s + n.price, 0) // treat as nominal units
    const payoutsPending = demoPayouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0)
    return {
      totalDonationsUSD: totalDonations,
      totalNftSales: totalNftUsdEstimate,
      payoutsPendingUSD: payoutsPending,
      sparkline: [10, 12, 8, 14, 18, 16, 20],
    }
  },
}
