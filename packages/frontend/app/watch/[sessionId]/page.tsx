"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { connectWallet, getAccounts } from "@/lib/wallet";
import { blockchain } from "@/modules/blockchain";
import { io, Socket } from "socket.io-client";
import Hls from "hls.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function WatchPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [address, setAddress] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [buyAmt, setBuyAmt] = useState<number>(1000);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reactionPrices, setReactionPrices] = useState<Record<string, number>>({ like: 100, haha: 200, wow: 500 });

  useEffect(() => {
    getAccounts().then((a) => setAddress(a[0] ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    // HLS playback via backend redirect
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
    const hlsUrl = `${apiBase}/stream/${encodeURIComponent(String(sessionId))}/hls?redirect=1`;
    if (videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = hlsUrl;
      }
    }
    // Socket reactions
    try {
      const wsUrl = (apiBase || window.location.origin).replace(/^http/, "ws");
      const token = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("streamfi-auth") || "{}").state?.session?.token : undefined;
      const socket = io(wsUrl, { transports: ["websocket"], query: { streamId: String(sessionId) }, auth: { token } });
      socketRef.current = socket;
      socket.on("connect", () => setLog((l) => ["[ws] connected", ...l]));
      socket.on("disconnect", () => setLog((l) => ["[ws] disconnected", ...l]));
      socket.on("new_reaction", (evt: { type: string; by: string }) => {
        setLog((l) => [`Reaction: ${evt.type} by ${evt.by.slice(0, 6)}`, ...l]);
      });
      socket.on("reaction_denied", () => {
        setLog((l) => ["Reaction denied (insufficient balance)", ...l]);
      });
    } catch {}
    return () => {
      socketRef.current?.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    // Load streamer-configured reactions/prices for this stream (public)
    (async () => {
      try {
        const items = await api<Array<{ key: string; priceInPaise: number }>>(`/api/reactions/by-stream/${encodeURIComponent(String(sessionId))}`);
        const map: Record<string, number> = {};
        for (const it of items) map[it.key] = Number(it.priceInPaise || 0);
        if (Object.keys(map).length) setReactionPrices(map);
      } catch {}
    })();
  }, [sessionId]);

  async function onConnect() {
    const acc = await connectWallet();
    setAddress(acc);
  }

  async function buyCredits() {
    if (!address) return;
    setLoading(true);
    try {
      await blockchain.deposit(String(sessionId), buyAmt, "INR");
      setCredits((c) => c + buyAmt);
      setLog((l) => [`Deposited ₹${(buyAmt / 100).toFixed(2)}`, ...l]);
    } catch {
      setCredits((c) => c + buyAmt);
      setLog((l) => [`[SIM] Deposited ₹${(buyAmt / 100).toFixed(2)}`, ...l]);
    } finally {
      setLoading(false);
    }
  }

  function reactOnce(kind: string, price: number) {
    if (!address) return;
    if (credits < price) {
      setLog((l) => ["Insufficient credits", ...l]);
      return;
    }
    setLoading(true);
    try {
      socketRef.current?.emit("reaction", { streamId: String(sessionId), type: kind });
      setCredits((c) => c - price);
      setLog((l) => [`Reacted: ${kind} (-₹${(price / 100).toFixed(2)})`, ...l]);
    } catch {
      setCredits((c) => c - price);
      setLog((l) => [`[SIM] Reacted: ${kind} (-₹${(price / 100).toFixed(2)})`, ...l]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Stream Overlay</h1>
      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <strong>Session:</strong> <code className="ml-2">{String(sessionId)}</code>
          <span className="ml-auto flex items-center">
            <strong>Wallet:</strong> <code className="ml-2">{address ?? "Not connected"}</code>
            <Button variant="outline" className="ml-2" onClick={onConnect}>
              {address ? "Reconnect" : "Connect Wallet"}
            </Button>
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <video ref={videoRef} className="w-full aspect-[16/9] rounded-xl" controls playsInline />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Balance: ₹{(credits / 100).toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={100}
                step={100}
                value={buyAmt}
                aria-label="Top-up amount in paise"
                placeholder="Amount in paise"
                onChange={(e) => setBuyAmt(Number(e.target.value))}
                className="w-40"
              />
              <Button variant="outline" onClick={buyCredits} disabled={loading || !address}>Buy Credits</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Amounts in paise (₹100 = ₹1.00)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(reactionPrices).map(([k, v]) => (
                <Button key={k} variant="outline" onClick={() => reactOnce(k, v)} disabled={loading || !address}>
                  {k} (₹{(v / 100).toFixed(2)})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-52 overflow-auto whitespace-pre-wrap">{log.join("\n")}</pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}