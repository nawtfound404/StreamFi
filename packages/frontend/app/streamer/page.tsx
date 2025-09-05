'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { connectWallet, getAccounts } from '@/lib/wallet';

type ReactionRule = { key: string; label: string; priceInPaise: number };

export default function StreamerPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [rules, setRules] = useState<ReactionRule[]>([
    { key: 'like', label: '👍 Like', priceInPaise: 100 },   // ₹1.00
    { key: 'haha', label: '😂 Haha', priceInPaise: 200 },   // ₹2.00
    { key: 'wow', label: '😲 Wow', priceInPaise: 500 }      // ₹5.00
  ]);

  useEffect(() => {
    getAccounts().then(a => setAddress(a[0] ?? null)).catch(() => {});
  }, []);

  const overlayUrl = useMemo(() => (sessionId ? `/watch/${encodeURIComponent(sessionId)}` : ''), [sessionId]);

  async function onConnect() {
    const acc = await connectWallet();
    setAddress(acc);
  }

  function updateRule(idx: number, priceInPaise: number) {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, priceInPaise: Math.max(0, Math.floor(priceInPaise)) } : r));
  }

  async function createSession() {
    setError('');
    if (!address) { setError('Connect wallet first'); return; }
    if (!streamUrl.trim()) { setError('Enter a live stream URL'); return; }

    setCreating(true);
    try {
      // Try backend-created session first
      const resp = await api<{ id: string }>(`/stream/sessions`, {
        method: 'POST',
        body: JSON.stringify({
          streamUrl,
          pricing: rules.reduce((m, r) => ({ ...m, [r.key]: r.priceInPaise }), {}),
          owner: address
        })
      });
      setSessionId(resp.id);
    } catch (e: any) {
      // Fallback: local demo session id for MVP demo
      const localId = `demo-${Date.now()}`;
      setSessionId(localId);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main>
      <h1>Streamer Console</h1>

      <section className="card">
        <div className="row">
          <strong>Wallet:</strong>
          <code style={{ marginLeft: 8 }}>{address ?? 'Not connected'}</code>
          <button style={{ marginLeft: 'auto' }} onClick={onConnect}>
            {address ? 'Reconnect' : 'Connect Wallet'}
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Live Stream</h2>
        <input
          placeholder="https://www.youtube.com/watch?v=..."
          value={streamUrl}
          onChange={e => setStreamUrl(e.target.value)}
          style={{ width: '100%' }}
        />
      </section>

      <section className="card">
        <h2>Reaction Pricing (paise)</h2>
        <div className="grid">
          {rules.map((r, idx) => (
            <div key={r.key}>
              <label>{r.label}</label>
              <input
                type="number"
                min={0}
                value={r.priceInPaise}
                onChange={(e) => updateRule(idx, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button onClick={createSession} disabled={creating}>
            {creating ? 'Creating...' : 'Create Session & Get Overlay Link'}
          </button>
          {error && <span style={{ color: 'crimson', marginLeft: 12 }}>{error}</span>}
        </div>
      </section>

      {sessionId && (
        <section className="card">
          <h2>Overlay Link</h2>
          <div className="row">
            <input readOnly value={overlayUrl} style={{ flex: 1 }} />
            <button onClick={() => navigator.clipboard.writeText(window.location.origin + overlayUrl)}>Copy</button>
            <a href={overlayUrl} target="_blank" rel="noreferrer">
              <button>Open</button>
            </a>
          </div>
          <p style={{ marginTop: 8 }}>
            Share this link with your audience. They’ll see your stream with the StreamFi overlay.
          </p>
        </section>
      )}
    </main>
  );
}