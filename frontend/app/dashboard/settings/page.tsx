"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { streaming } from "@/modules/streaming"

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Streamer")
  const [about, setAbout] = useState("")
  const [payoutEmail, setPayoutEmail] = useState("")
  const [ingest, setIngest] = useState<{ key: string; ingestUrl: string } | null>(null)
  const [revealed, setRevealed] = useState(false)
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="display">Display name</Label>
            <Input id="display" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="payout">Payout email</Label>
            <Input id="payout" placeholder="payments@example.com" value={payoutEmail} onChange={(e)=>setPayoutEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="about">About</Label>
          <textarea id="about" aria-label="About" className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={4} value={about} onChange={(e)=>setAbout(e.target.value)} />
        </div>
        <Button type="button" className="w-fit">Save</Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="font-medium">Stream Key & Ingest</div>
        <div className="text-sm text-muted-foreground">Generate a new ingest and reveal your stream key.</div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={async ()=>{ const s = await streaming.createIngest(); setIngest({ key: s.key, ingestUrl: s.ingestUrl }) }}>Generate</Button>
          {ingest && (
            <div className="text-sm">
              <div>Ingest: <span className="font-mono">{ingest.ingestUrl}</span></div>
              <div>Key: <span className="font-mono">{revealed ? ingest.key : "••••••••"}</span> <Button variant="outline" size="sm" onClick={()=>setRevealed(r=>!r)}>{revealed?"Hide":"Reveal"}</Button></div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="font-medium mb-2">Ingest Status</div>
        <div className="text-sm text-muted-foreground">Offline (demo)</div>
      </Card>
    </main>
  )
}
