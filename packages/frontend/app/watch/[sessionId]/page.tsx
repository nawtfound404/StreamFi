'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { connectWallet, getAccounts } from '@/lib/wallet';
import { blockchain } from '@/modules/blockchain';
import { io, Socket } from 'socket.io-client';

type Session = { id: string; streamUrl: string; pricing?: Record<string, number> };

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    // Add twitch etc. as needed
    return url;
  } catch { return url; }
}

export default function WatchPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [address, setAddress] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [credits, setCredits] = useState<number>(0); // paise
  const [buyAmt, setBuyAmt] = useState<number>(1000); // default ₹10.00
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    getAccounts().then(a => setAddress(a[0] ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    // No dedicated session API yet: use a demo fallback and let HLS page handle actual playback
    setSession({
      id: sessionId,
      streamUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      pricing: { like: 100, haha: 200, wow: 500 },
    });
    // Wire Socket.IO for reactions and chat overlay scoped to this stream
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || '';
      const wsUrl = base.replace(/^http/, 'ws');
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
      const socket = io(wsUrl, { transports: ['websocket'], query: { streamId: String(sessionId) }, auth: { token } });
      socketRef.current = socket;
      socket.on('connect', () => setLog(l => [`[ws] connected`, ...l]));
      socket.on('disconnect', () => setLog(l => [`[ws] disconnected`, ...l]));
      socket.on('new_reaction', (evt: { type: string; by: string }) => {
        setLog(l => [`Reaction: ${evt.type} by ${evt.by.slice(0,6)}`, ...l]);
      });
      socket.on('reaction_denied', () => {
        setLog(l => [`Reaction denied (insufficient balance)`, ...l]);
      });
    } catch { /* noop */ }
    return () => { socketRef.current?.disconnect(); };
  }, [sessionId]);

  const embedUrl = useMemo(() => toEmbedUrl(session?.streamUrl || ''), [session?.streamUrl]);

  async function onConnect() {
    const acc = await connectWallet();
    setAddress(acc);
  }

  async function buyCredits() {
    if (!address) return;
    setLoading(true);
    try {
      // Off-chain deposit tracked per stream
      await blockchain.deposit(String(sessionId), buyAmt, 'INR');
      setCredits(c => c + buyAmt);
      setLog(l => [`Deposited ₹${(buyAmt/100).toFixed(2)}`, ...l]);
    } catch {
      // Fallback: simulate purchase for demo
      setCredits(c => c + buyAmt);
      setLog(l => [`[SIM] Deposited ₹${(buyAmt/100).toFixed(2)}`, ...l]);
    } finally {
      setLoading(false);
    }
  }

  async function reactOnce(kind: string, price: number) {
    if (!address) return;
    if (credits < price) { setLog(l => [`Insufficient credits`, ...l]); return; }
    setLoading(true);
    try {
      // Emit reaction via socket; backend will validate and broadcast
      socketRef.current?.emit('reaction', { streamId: String(sessionId), type: kind });
      // Optimistic debit; if denied event arrives, user will see the log
      setCredits(c => c - price);
      setLog(l => [`Reacted: ${kind} (-₹${(price/100).toFixed(2)})`, ...l]);
    } catch {
      // Fallback: simulate for demo
      setCredits(c => c - price);
      setLog(l => [`[SIM] Reacted: ${kind} (-₹${(price/100).toFixed(2)})`, ...l]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Stream Overlay</h1>
      <div className="row flex items-center gap-2">
        <strong>Session:</strong> <code className="ml-2">{sessionId}</code>
        <span className="ml-auto flex items-center">
          <strong>Wallet:</strong> <code className="ml-2">{address ?? 'Not connected'}</code>
          <button className="ml-2 px-3 py-1 rounded border" onClick={onConnect}>{address ? 'Reconnect' : 'Connect Wallet'}</button>
        </span>
      </div>

      <section className="card">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title="Embedded Stream"
            className="w-full aspect-[16/9] rounded-xl border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <p>Loading stream...</p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-3">
          <h2 className="font-medium mb-1">Credits</h2>
          <p>Balance: ₹{(credits / 100).toFixed(2)}</p>
          <div className="row flex items-center gap-2 mt-2">
            <input
              type="number"
              min={100}
              step={100}
              value={buyAmt}
              aria-label="Top-up amount in paise"
              placeholder="Amount in paise"
              onChange={(e) => setBuyAmt(Number(e.target.value))}
              className="px-2 py-1 rounded border w-40"
            />
            <button onClick={buyCredits} disabled={loading || !address} className="px-3 py-1 rounded border">Buy Credits</button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Amounts in paise (₹100 = ₹1.00)</p>
        </div>

        <div className="card p-3">
          <h2 className="font-medium mb-1">Reactions</h2>
          <div className="row flex flex-wrap gap-2">
            {Object.entries(session?.pricing ?? { like: 100, haha: 200, wow: 500 }).map(([k, v]) => (
              <button key={k} onClick={() => reactOnce(k, v)} disabled={loading || !address} className="px-3 py-1 rounded border mr-2">
                {k} (₹{(v/100).toFixed(2)})
              </button>
            ))}
          </div>
        </div>

        <div className="card p-3">
          <h2 className="font-medium mb-1">Activity</h2>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap">{log.join('\n')}</pre>
        </div>
      </section>
    </main>
  );
}