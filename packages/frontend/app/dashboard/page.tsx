"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useAuthStore } from "../../stores/auth-store"
import { monetization, type Donation } from "../../modules/monetization"
import { analytics } from "../../modules/analytics"
import { Card } from "../../components/ui/card"
import Link from 'next/link'
export default function Page() {
  const session = useAuthStore((s) => s.session)
  const router = useRouter()
  useEffect(() => {
    if (!session) router.replace("/auth")
  }, [session, router])
  const [kpi, setKpi] = useState<{ donations: number; nfts: number; pending: number } | null>(null)
  const [series, setSeries] = useState<{ t: number; viewers: number; donations: number }[]>([])
  const [recent, setRecent] = useState<Donation[]>([])
  useEffect(() => {
    ;(async () => {
  const s = await monetization.getSummary()
      const m = await analytics.getLiveMetrics()
  const d = await monetization.getDonations()
  setKpi({ donations: Number(s.totalDonationsUSD||0), nfts: Number(s.totalNftSales||0), pending: Number(s.payoutsPendingUSD||0) })
      setSeries(m)
  setRecent(d.slice(0,5))
    })()
  }, [])
  return (
    <>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Donations</div>
              <div className="text-2xl font-semibold">{kpi ? `$${kpi.donations.toFixed(2)}` : "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">NFT Sales</div>
              <div className="text-2xl font-semibold">{kpi ? `${kpi.nfts.toFixed(2)} ETH` : "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Payouts Pending</div>
              <div className="text-2xl font-semibold">{kpi ? `$${kpi.pending.toFixed(2)}` : "—"}</div>
            </Card>
          </div>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-2">Live Viewers (last 20)</div>
            <div className="flex gap-1 items-end h-24">
              {series.map((pt) => {
                const hClasses = [
                  "h-1","h-2","h-3","h-4","h-5","h-6","h-7","h-8","h-9","h-10","h-11","h-12",
                  "h-13","h-14","h-15","h-16","h-17","h-18","h-19","h-20","h-21","h-22","h-23","h-24",
                ] as const
                const idx = Math.max(0, Math.min(hClasses.length - 1, Math.round(pt.viewers / 20)))
                return <div key={pt.t} className={`w-2 bg-primary/60 ${hClasses[idx]}`} />
              })}
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Quick Actions</div>
              <div className="flex flex-wrap gap-2">
                <a href="/dashboard/monetization" className="px-3 py-2 rounded-md border hover:bg-muted text-sm">Go to Monetization</a>
                <a href="/dashboard/settings" className="px-3 py-2 rounded-md border hover:bg-muted text-sm">Open Settings</a>
                <Link href="/streams" className="px-3 py-2 rounded-md border hover:bg-muted text-sm">Browse Streams</Link>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Streaming Checklist</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Generate stream key in Settings</li>
                <li>Configure OBS with ingest URL and key</li>
                <li>Start stream and verify HLS playback</li>
                <li>Engage chat and enable donations</li>
              </ul>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Recent Donations</div>
              <div className="space-y-2 text-sm">
                {recent.length === 0 ? (
                  <div className="text-muted-foreground">No donations yet.</div>
                ) : recent.map((r)=> (
                  <div key={r.id} className="flex justify-between border-b last:border-0 pb-2">
                    <span className="font-medium">{r.from}</span>
                    <span>${r.amount.toFixed(2)} {r.currency}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Ingest Status</div>
              <div className="text-sm">Offline (demo)</div>
            </Card>
          </div>
        </div>
    </>
  )
}
