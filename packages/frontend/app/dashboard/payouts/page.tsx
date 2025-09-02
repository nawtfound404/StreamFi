"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

type Payout = { id: string; amount: number; currency: string; status: string; createdAt: string };

export default function PayoutsPage() {
  const [items, setItems] = useState<Payout[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [streamId, setStreamId] = useState<string>("");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || '';
    const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
    fetch(`${base}/monetization/payouts`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then(r=>r.json()).then(setItems).catch(()=>setItems([]));
  }, []);

  const downloadCsv = () => {
    const base = process.env.NEXT_PUBLIC_API_BASE || '';
    const q: string[] = [];
    if (from) q.push(`from=${encodeURIComponent(from)}`);
    if (to) q.push(`to=${encodeURIComponent(to)}`);
    if (streamId) q.push(`streamId=${encodeURIComponent(streamId)}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    const url = `${base}/monetization/donations.csv${qs}`;
    const a = document.createElement('a'); a.href = url; a.download = 'donations.csv'; a.click();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold mb-4">Payouts</h1>
      <Card className="mb-4">
        <CardContent className="p-4 grid gap-3">
          <div className="text-sm font-medium">Donations CSV export</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input type="datetime-local" value={from} onChange={(e)=>setFrom(e.target.value)} placeholder="From" />
            <Input type="datetime-local" value={to} onChange={(e)=>setTo(e.target.value)} placeholder="To" />
            <Input value={streamId} onChange={(e)=>setStreamId(e.target.value)} placeholder="Stream ID (optional)" />
          </div>
          <div>
            <Button onClick={downloadCsv}>Download CSV</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium mb-2">Your payout requests</div>
          <div className="text-xs text-muted-foreground mb-2">Newest first</div>
          <div className="grid grid-cols-5 gap-2 text-xs font-medium border-b pb-1">
            <div>ID</div><div>Amount</div><div>Currency</div><div>Status</div><div>Created</div>
          </div>
          <div className="space-y-1 mt-2">
            {items.map(x => (
              <div key={x.id} className="grid grid-cols-5 gap-2 text-xs">
                <div className="truncate">{x.id}</div>
                <div>{x.amount}</div>
                <div>{x.currency}</div>
                <div>{x.status}</div>
                <div>{new Date(x.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {items.length === 0 && (<div className="text-xs text-muted-foreground">No payout requests yet.</div>)}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}