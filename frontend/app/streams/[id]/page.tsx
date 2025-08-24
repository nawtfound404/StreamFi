"use client";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { hlsUrlFor, chatWsUrlFor } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Dot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { monetization } from "@/modules/monetization";
import { blockchain } from "@/modules/blockchain";
import { useState } from "react";
import { analytics } from "@/modules/analytics";

export default function StreamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [donation, setDonation] = useState(5);
  const hlsSrc = hlsUrlFor(String(id));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSrc;
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [hlsSrc]);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Placeholder WebSocket URL; replace with real chat endpoint
  const ws = new WebSocket(chatWsUrlFor(String(id)));
    wsRef.current = ws;
    ws.onmessage = () => {
      // In a real client, parse and append to state; keep simple placeholder
      if (messagesRef.current) {
        const el = document.createElement("div");
        el.className = "text-sm";
        el.textContent = "New message";
        messagesRef.current.appendChild(el);
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    };
    return () => ws.close();
  }, [id]);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="default">Live</Badge>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>253</span>
            <Dot className="h-4 w-4" />
            <span>1080p</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Gaming</Badge>
          <Badge variant="secondary">Esports</Badge>
          <Badge variant="secondary">English</Badge>
        </div>
      </div>
      <Separator className="mb-4" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Latency: ~2.1s</div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Quality</span>
                <select aria-label="Quality" className="h-8 rounded-md border bg-background px-2 text-sm">
                  <option>1080p</option>
                  <option>720p</option>
                  <option>Audio only</option>
                </select>
              </div>
            </div>
            <video ref={videoRef} controls playsInline className="w-full rounded-md bg-black aspect-video" />
            <div className="flex items-center gap-2 mt-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Donate</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Support the streamer</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={1} value={donation} onChange={(e) => setDonation(parseInt(e.target.value || "0", 10))} className="w-24" />
                    <Button onClick={async () => { await monetization.donate({ amount: donation, currency: "USD", from: "viewer" }); }}>Send</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={async () => { await blockchain.mintNFT({ to: "viewer", type: "badge", metadata: { streamId: id } }); }}>Mint Fan Badge</Button>
            </div>
          </CardContent>
        </Card>
  <Card>
          <CardContent className="p-0 h-full flex flex-col">
            <ScrollArea className="h-72 p-3">
              <div ref={messagesRef} className="space-y-2">
                <div className="text-sm text-muted-foreground">Welcome to chat</div>
              </div>
            </ScrollArea>
            <div className="p-2 border-t flex gap-2">
              <Input placeholder="Send a message" onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val && wsRef.current?.readyState === 1) { wsRef.current.send(val); (e.target as HTMLInputElement).value = ""; }
                }
              }} />
              <Button onClick={() => {
                const input = document.querySelector<HTMLInputElement>('input[placeholder="Send a message"]');
                const val = input?.value.trim();
                if (val && wsRef.current?.readyState === 1) { wsRef.current.send(val); if (input) input.value = ""; }
              }}>Send</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-3">
          <CardContent className="p-4">
            <ViewerStats />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ViewerStats() {
  const [points, setPoints] = useState<{ t: number; viewers: number; donations: number }[]>([]);
  useEffect(() => {
    let mounted = true
    const tick = async () => {
      const data = await analytics.getLiveMetrics()
      if (mounted) setPoints(data)
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => { mounted = false; clearInterval(id) }
  }, [])
  return (
    <div className="text-sm">
      <div className="mb-2 font-medium">Viewer stats</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Current viewers</div><div className="text-lg font-semibold">{points.at(-1)?.viewers ?? 0}</div></div>
        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Donations (5m)</div><div className="text-lg font-semibold">{points.slice(-5).reduce((s,p)=>s+p.donations,0)}</div></div>
        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Peak viewers</div><div className="text-lg font-semibold">{points.reduce((m,p)=>Math.max(m,p.viewers),0)}</div></div>
      </div>
    </div>
  )
}
