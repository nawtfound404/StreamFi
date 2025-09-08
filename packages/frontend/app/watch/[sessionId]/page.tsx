"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { connectWallet, getAccounts } from "@/lib/wallet";
import { blockchain } from "@/modules/blockchain";
import { io, Socket } from "socket.io-client";
import Hls from "hls.js";
import { hlsUrlFor } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { users } from "@/modules/users";
import { useAuthStore } from "@/stores/auth-store";

export default function WatchPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const session = useAuthStore((s) => s.session);
  const [address, setAddress] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [buyAmt, setBuyAmt] = useState<number>(1000);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reactionPrices, setReactionPrices] = useState<Record<string, number>>({ like: 100, haha: 200, wow: 500 });
  const [chat, setChat] = useState<Array<{ id: string; user: string; text: string; at: number }>>([]);
  const [text, setText] = useState("");
  // Lightweight animation overlays
  const [bursts, setBursts] = useState<Array<{ id: number; label: string }>>([]);
  const [chatFx, setChatFx] = useState<Array<{ id: number; text: string }>>([]);

  useEffect(() => {
    getAccounts().then((a) => setAddress(a[0] ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    // viewer join/leave tracking when logged in
    let joined = false;
    (async () => {
      try {
        if (session?.token) {
          await users.joinStream(String(sessionId));
          joined = true;
        }
      } catch {}
    })();

    // HLS playback via backend redirect (id or key supported)
    const hlsUrl = hlsUrlFor(String(sessionId));
    if (videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
        // Cleanup on unmount to avoid leaks
        return () => {
          try { hls.destroy(); } catch {}
        };
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = hlsUrl;
      }
    }
    // Socket reactions
    try {
      // Always connect via frontend origin; Next.js rewrites proxy to backend
      const wsUrl = window.location.origin.replace(/^http/, "ws");
      const token = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("streamfi-auth") || "{}").state?.session?.token : undefined;
      const socket = io(wsUrl, { transports: ["websocket"], query: { streamId: String(sessionId) }, auth: { token } });
      socketRef.current = socket;
      socket.on("connect", () => setLog((l) => ["[ws] connected", ...l]));
      socket.on("disconnect", () => setLog((l) => ["[ws] disconnected", ...l]));
      socket.on("new_reaction", (evt: { type: string; by: string }) => {
        setLog((l) => [`Reaction: ${evt.type} by ${evt.by.slice(0, 6)}`, ...l]);
        // add burst animation
        const id = Date.now();
        const label = evt.type.toUpperCase();
        setBursts((b) => [...b, { id, label }]);
        setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1200);
      });
      socket.on("viewer_count", (p: { viewers?: number }) => {
        if (typeof p?.viewers === 'number') setLog((l) => [
          `Viewers: ${p.viewers}`,
          ...l
        ]);
      });
      socket.on("reaction_denied", () => {
        setLog((l) => ["Reaction denied (insufficient balance)", ...l]);
      });
      socket.on("chat_message", (m: { id: string; user: string; text: string; at: number }) => {
        setChat((c) => [...c, m]);
        const id = Math.floor(Math.random() * 1e9);
        setChatFx((fx) => [...fx, { id, text: m.text }]);
        setTimeout(() => setChatFx((fx) => fx.filter((x) => x.id !== id)), 1000);
      });
    } catch {}
    return () => {
      socketRef.current?.disconnect();
      if (joined) users.leaveStream(String(sessionId)).catch(() => {});
    };
  }, [sessionId, session?.token]);

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

  useEffect(() => {
    // fetch initial chat history
    (async () => {
      try {
        const r = await api<{ items: Array<{ _id: string; userId: string; text: string; createdAt: string }> }>(
          `/api/chat/${encodeURIComponent(String(sessionId))}/messages`
        );
        setChat(
          (r.items || []).map((i) => ({ id: i._id, user: i.userId, text: i.text, at: new Date(i.createdAt).getTime() }))
        );
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

  async function sendChat() {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const token = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("streamfi-auth") || "{}").state?.session?.token : undefined;
      const csrfRes = await fetch(`/api/csrf`, { credentials: "include" });
      const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
      const res = await fetch(`/api/chat/${encodeURIComponent(String(sessionId))}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { item: { _id: string; userId: string; text: string; createdAt: string } };
      setChat((c) => [...c, { id: data.item._id, user: data.item.userId, text: data.item.text, at: new Date(data.item.createdAt).getTime() }]);
  } catch {
      setLog((l) => ["Chat send failed", ...l]);
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
            <CardContent className="p-0 relative overflow-hidden">
              <video ref={videoRef} className="w-full aspect-[16/9] rounded-xl" controls playsInline />
              {/* Reaction bursts */}
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
                <div className="relative w-full h-0">
                  {bursts.map((b) => (
                    <span
                      key={b.id}
                      className="absolute left-1/2 -translate-x-1/2 mb-6 select-none text-2xl font-bold animate-bounce text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
              {/* Chat float-ups */}
              <div className="pointer-events-none absolute inset-0">
                {chatFx.map((c) => (
                  <div
                    key={c.id}
                    className="absolute bottom-6 left-6 text-white/90 text-sm bg-black/30 rounded px-2 py-1 animate-fade-up"
                  >
                    {c.text}
                  </div>
                ))}
              </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto space-y-1 mb-2">
            {chat.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="text-muted-foreground mr-2">{m.user.slice(0, 6)}:</span>
                <span>{m.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Say something" />
            <Button onClick={sendChat} disabled={!session}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}