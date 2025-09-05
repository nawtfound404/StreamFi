'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { connectWallet, getAccounts } from '@/lib/wallet';

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

  useEffect(() => {
    getAccounts().then(a => setAddress(a[0] ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api<Session>(`/stream/sessions/${encodeURIComponent(sessionId)}`);
        if (mounted) setSession(data);
      } catch {
        // Fallback demo session
        if (mounted) setSession({
          id: sessionId,
          streamUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
          pricing: { like: 100, haha: 200, wow: 500 }
        });
      }
    }
    load();
    return () => { mounted = false; };
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
      await api(`/vaults/credits/purchase`, {
        method: 'POST',
        body: JSON.stringify({ amountPaise: buyAmt, sessionId, wallet: address })
      });
      setCredits(c => c + buyAmt);
      setLog(l => [`Bought ₹${(buyAmt/100).toFixed(2)}`, ...l]);
    } catch {
      // Fallback: simulate purchase for demo
      setCredits(c => c + buyAmt);
      setLog(l => [`[SIM] Bought ₹${(buyAmt/100).toFixed(2)}`, ...l]);
    } finally {
      setLoading(false);
    }
  }

  async function reactOnce(kind: string, price: number) {
    if (!address) return;
    if (credits < price) { setLog(l => [`Insufficient credits`, ...l]); return; }
    setLoading(true);
    try {
      await api(`/monetization/reactions`, {
        method: 'POST',
        body: JSON.stringify({ sessionId, kind, wallet: address })
      });
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
    <main>
      <h1>Stream Overlay</h1>
      <div className="row">
        <strong>Session:</strong> <code style={{ marginLeft: 8 }}>{sessionId}</code>
        <span style={{ marginLeft: 'auto' }}>
          <strong>Wallet:</strong> <code style={{ marginLeft: 8 }}>{address ?? 'Not connected'}</code>
          <button style={{ marginLeft: 8 }} onClick={onConnect}>{address ? 'Reconnect' : 'Connect Wallet'}</button>
        </span>
      </div>

      <section className="card">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 12 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <p>Loading stream...</p>
        )}
      </section>

      <section className="grid">
        <div className="card">
          <h2>Credits</h2>
          <p>Balance: ₹{(credits / 100).toFixed(2)}</p>
          <div className="row">
            <input
              type="number"
              min={100}
              step={100}
              value={buyAmt}
              onChange={(e) => setBuyAmt(Number(e.target.value))}
            />
            <button onClick={buyCredits} disabled={loading || !address}>Buy Credits</button>
          </div>
          <p style={{ fontSize: 12, color: '#666' }}>Amounts in paise (₹100 = ₹1.00)</p>
        </div>

        <div className="card">
          <h2>Reactions</h2>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {Object.entries(session?.pricing ?? { like: 100, haha: 200, wow: 500 }).map(([k, v]) => (
              <button key={k} onClick={() => reactOnce(k, v)} disabled={loading || !address} style={{ marginRight: 8 }}>
                {k} (₹{(v/100).toFixed(2)})
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Activity</h2>
          <pre style={{ maxHeight: 200 }}>{log.join('\n')}</pre>
        </div>
      </section>
    </main>
  );
}