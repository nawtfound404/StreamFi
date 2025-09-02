"use client";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { hlsUrlFor } from "../../../lib/config";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import { Users, Dot } from "lucide-react";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { monetization } from "../../../modules/monetization";
import { blockchain } from "../../../modules/blockchain";
import { useAccount } from "wagmi";
import { useState } from "react";
import { io, Socket } from "socket.io-client";
import { analytics } from "../../../modules/analytics";

export default function StreamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [donation, setDonation] = useState(5);
  const hlsSrc = hlsUrlFor(String(id));
  const { address, isConnected } = useAccount();
  const [owned, setOwned] = useState<{ tokenId: string; tokenURI: string }[]>([]);

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

  const wsRef = useRef<Socket | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || '';
    const wsUrl = base.replace(/^http/, 'ws');
  const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
  const socket = io(wsUrl, { transports: ['websocket'], query: { streamId: String(id) }, auth: { token } });
    wsRef.current = socket;
    // Load persisted chat
    fetch(`${base}/chat/${id}/messages`).then(r=>r.json()).then((data)=>{
      if (messagesRef.current && Array.isArray(data?.items)) {
        for (const m of data.items) {
          const el = document.createElement('div');
          el.className = 'text-sm';
          el.textContent = `${m.userId?.slice(0,6) ?? 'anon'}: ${m.text}`;
          messagesRef.current.appendChild(el);
        }
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    }).catch(()=>void 0);
    socket.on('chat_message', (msg: { user: string; text: string }) => {
      if (messagesRef.current) {
        const el = document.createElement('div');
        el.className = 'text-sm';
        el.textContent = `${msg.user}: ${msg.text}`;
        messagesRef.current.appendChild(el);
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    });
    return () => { socket.disconnect(); };
  }, [id]);

  // Load owned NFTs via backend route
  useEffect(() => {
    let stop = false;
    async function loadOwned() {
      if (!isConnected || !address) { setOwned([]); return; }
      const items = await blockchain.listOwned(address);
      if (stop) return;
      setOwned(items);
    }
    loadOwned();
    return () => { stop = true; };
  }, [address, isConnected]);

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
              <Button disabled={!isConnected}
                onClick={async () => {
                  if (!address) return;
                  await blockchain.mintNFT({ to: address, type: "badge", metadata: { streamId: id } });
                }}>
                {isConnected ? "Mint Fan Badge" : "Connect Wallet to Mint"}
              </Button>
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
                  if (val && wsRef.current) { wsRef.current.emit('chat_message', { streamId: String(id), text: val, user: 'viewer' }); (e.target as HTMLInputElement).value = ""; }
                }
              }} />
              <Button onClick={() => {
                const input = document.querySelector<HTMLInputElement>('input[placeholder="Send a message"]');
                const val = input?.value.trim();
                if (val && wsRef.current) { wsRef.current.emit('chat_message', { streamId: String(id), text: val, user: 'viewer' }); if (input) input.value = ""; }
              }}>Send</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 font-medium text-sm">Owned NFTs (first 10)</div>
            {!isConnected && <div className="text-xs text-muted-foreground">Connect wallet to view owned NFTs.</div>}
            {isConnected && (
              <OwnedList items={owned} />
            )}
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

type NftAttribute = { trait_type?: string; value?: string | number | boolean };
type NftMetadata = { name?: string; image?: string; description?: string; attributes?: NftAttribute[] };
function OwnedList({ items }: { items: { tokenId: string; tokenURI: string }[] }) {
  const { address } = useAccount();
  const [list, setList] = useState<{ tokenId: string; tokenURI: string }[]>(items || []);
  const [meta, setMeta] = useState<Record<string, NftMetadata>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Initial load when wallet or initial items change
  useEffect(() => {
    setList(items || []);
    setCursor(null);
    setDone(false);
  }, [items]);

  // Metadata loader for visible items
  useEffect(() => {
    let cancel = false;
    async function loadVisibleMeta() {
      const result: Record<string, NftMetadata> = { ...meta };
      for (const it of list) {
        if (result[it.tokenId]) continue;
        try {
          const data = await blockchain.getTokenMetadata(it.tokenId);
          const j = data?.metadata as NftMetadata;
          if (j && typeof j === 'object') {
            result[it.tokenId] = { name: j.name, image: j.image, description: j.description, attributes: Array.isArray(j.attributes) ? j.attributes : undefined };
          }
        } catch { /* ignore */ }
      }
      if (!cancel) setMeta(result);
    }
    if (list.length) loadVisibleMeta();
    return () => { cancel = true; };
  }, [list]);

  // IntersectionObserver to trigger pagination
  useEffect(() => {
    if (!address) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(async (entries) => {
      const first = entries[0];
      if (!first?.isIntersecting) return;
      if (loading || done) return;
      setLoading(true);
      try {
        const page = await blockchain.listOwnedPage(address, { cursor, limit: 20 });
        setList((prev) => [...prev, ...(page.items || [])]);
        setCursor(page.nextCursor ?? null);
        if (!page.nextCursor) setDone(true);
      } finally {
        setLoading(false);
      }
    }, { threshold: 1.0 });
    io.observe(el);
    return () => io.disconnect();
  }, [address, cursor, loading, done]);

  if (!list.length) return <div className="text-xs text-muted-foreground">No NFTs found.</div>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {list.map((t) => {
        const m: NftMetadata = meta[t.tokenId] || {};
        const img = m.image;
        return (
          <div key={t.tokenId} className="rounded-md border p-2 text-xs">
            <div className="font-medium">Token #{t.tokenId}</div>
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={m.name || `Token ${t.tokenId}`} className="mt-1 w-full h-24 object-cover rounded" />
            ) : (
              <div className="truncate text-muted-foreground">{t.tokenURI}</div>
            )}
            {m.name && <div className="mt-1">{m.name}</div>}
            {m.description && <div className="text-muted-foreground mt-1 line-clamp-2">{m.description}</div>}
            {Array.isArray(m.attributes) && m.attributes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {m.attributes.slice(0,3).map((a: NftAttribute, idx: number) => (
                  <span key={idx} className="rounded bg-secondary px-1 py-0.5 text-[10px]">{a?.trait_type ?? 'attr'}: {String(a?.value ?? '')}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="col-span-2 flex items-center justify-center py-2">
        {loading ? <span className="text-xs text-muted-foreground">Loading…</span> : done ? <span className="text-xs text-muted-foreground">End</span> : <span className="text-xs text-muted-foreground">Scroll to load more</span>}
      </div>
    </div>
  );
}
