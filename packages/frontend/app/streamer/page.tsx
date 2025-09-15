"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { connectWallet, getAccounts } from "@/lib/wallet";
import { streaming } from "@/modules/streaming";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card as UICard } from "@/components/ui/card";
import { Input as UIInput } from "@/components/ui/input";
import { admin } from "@/modules/admin";
import { useAuthStore } from "@/stores/auth-store";
import { users } from "@/modules/users";

type ReactionRule = { key: string; label: string; priceInPaise: number };

export default function StreamerPage() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const role = session?.role?.toString().toUpperCase();
  const isAllowed = role === 'STREAMER' || role === 'ADMIN';
  if (!isAllowed) {
    return (
      <main className="p-4 space-y-3">
        <h1 className="text-xl font-semibold">My Stream</h1>
        <p className="text-sm text-muted-foreground">Only creators can access this page.</p>
        <Button
          onClick={async () => {
            try {
              await users.setRole('STREAMER');
              if (session) setSession({ ...session, role: 'STREAMER' } as any);
              // Hard reload to re-run auth gate and page effects
              window.location.replace('/streamer');
            } catch (e) {
              console.error('Failed to set role', e);
            }
          }}
        >
          Become a Creator
        </Button>
      </main>
    );
  }
  const [address, setAddress] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [streamKey, setStreamKey] = useState<string>("");
  const [streamId, setStreamId] = useState<string>("");
  const [hlsUrl, setHlsUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [rules, setRules] = useState<ReactionRule[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReactionRule | null>(null);
  const [form, setForm] = useState<ReactionRule>({ key: "", label: "", priceInPaise: 0 });
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [status, setStatus] = useState<'IDLE' | 'LIVE' | string>('IDLE');
  const [chat, setChat] = useState<Array<{ id: string; user: string; text: string; at: number }>>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [text, setText] = useState("");
  const socketRef = useRef<Socket | null>(null);
  // Local preview media
  const camRef = useRef<HTMLVideoElement | null>(null);
  const screenRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token as string | undefined : undefined;
      const csrfRes = await fetch(`/api/csrf`, { credentials: 'include' });
      const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
      return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      };
    } catch { return { 'Content-Type': 'application/json' }; }
  }

  useEffect(() => {
    getAccounts().then((a) => setAddress(a[0] ?? null)).catch(() => {});
    // Load existing reactions for this streamer
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/reactions`, { headers, credentials: 'include' });
        if (res.ok) {
          const data = await res.json() as ReactionRule[];
          setRules(data);
        }
      } catch {}
    })();
  // Auto-create/fetch ingest for creators
    (async () => {
      try {
        const token = JSON.parse(localStorage.getItem('streamfi-auth') || '{}').state?.session?.token as string | undefined;
        if (!token) return;
        const role = JSON.parse(localStorage.getItem('streamfi-auth') || '{}').state?.session?.role?.toString().toUpperCase();
        if (role === 'STREAMER' || role === 'ADMIN') {
          const info = await streaming.createIngest();
          setStreamKey(info.key);
      if (info.id) setStreamId(info.id);
      // Prefer HLS by streamId; fall back to key only if id not present (dev fallback)
      setHlsUrl(info.hlsUrl || (info.id ? streaming.hlsFor(info.id) : streaming.hlsFor(info.key)));
        }
      } catch {}
    })();
    // Chat will load after we create/fetch ingest and know key/stream
  }, []);

  async function onConnect() {
    const acc = await connectWallet();
    setAddress(acc);
  }

  // Viewer count polling (use streamId only)
  useEffect(() => {
    const id = streamId;
    if (!id) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const res = await fetch(`/api/stream/${encodeURIComponent(id)}/status`);
        if (res.ok) {
          const data = await res.json() as { viewers?: number; status?: 'IDLE' | 'LIVE' };
          if (typeof data.viewers === 'number') setViewerCount(data.viewers);
          if (data.status) setStatus(data.status);
        }
      } catch {}
      timer = setTimeout(tick, 5000);
    };
    tick();
    return () => { if (timer) clearTimeout(timer); };
  }, [streamId]);

  // Realtime viewer_count and chat via socket (use streamId only)
  useEffect(() => {
    const id = streamId;
    if (!id) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
      const wsUrl = (apiBase || window.location.origin).replace(/^http/, "ws");
      const token = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("streamfi-auth") || "{}").state?.session?.token : undefined;
      const socket = io(wsUrl, { transports: ["websocket"], query: { streamId: String(id) }, auth: { token } });
      socketRef.current = socket;
      socket.on("viewer_count", (p: { viewers?: number }) => {
        if (typeof p?.viewers === "number") setViewerCount(p.viewers);
      });
      socket.on("stream_status", (p: { status?: 'IDLE' | 'LIVE' }) => {
        if (p?.status) setStatus(p.status);
      });
      socket.on("chat_message", (m: { id: string; user: string; text: string; at: number }) => {
        setChat((c) => [...c, m]);
      });
      return () => { socket.disconnect(); };
    } catch {
      // ignore
    }
  }, [streamId]);

  function updateRule(idx: number, priceInPaise: number) {
    setRules((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, priceInPaise: Math.max(0, Math.floor(priceInPaise)) } : r))
    );
  }

  async function saveReaction() {
    try {
      const payload = { ...form, priceInPaise: Math.max(0, Math.floor(Number(form.priceInPaise || 0))) };
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/reactions`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      // refresh list
      {
        const listRes = await fetch(`/api/reactions`, { headers, credentials: 'include' });
        if (listRes.ok) setRules(await listRes.json() as ReactionRule[]);
      }
      setOpen(false);
      setEditing(null);
      setForm({ key: "", label: "", priceInPaise: 0 });
    } catch (e: unknown) {
      function asMessage(err: unknown): string {
        if (err instanceof Error) return err.message;
        if (typeof err === 'object' && err && 'toString' in err) return String(err);
        return 'Failed to save reaction';
      }
      setError(asMessage(e));
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ key: "", label: "", priceInPaise: 0 });
    setOpen(true);
  }

  function openEdit(r: ReactionRule) {
    setEditing(r);
    setForm(r);
    setOpen(true);
  }

  async function removeReaction(key: string) {
    try {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/reactions/${encodeURIComponent(key)}`, { method: 'DELETE', headers, credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  const listRes = await fetch(`/api/reactions`, { headers, credentials: 'include' });
  if (listRes.ok) setRules(await listRes.json() as ReactionRule[]);
    } catch (e: unknown) {
      function asMessage(err: unknown): string {
        if (err instanceof Error) return err.message;
        if (typeof err === 'object' && err && 'toString' in err) return String(err);
        return 'Failed to delete';
      }
      setError(asMessage(e));
    }
  }

  async function createIngest() {
    setError("");
    if (!address) {
      setError("Connect wallet first");
      return;
    }
    setCreating(true);
    try {
  const info = await streaming.createIngest();
  setStreamKey(info.key);
  if (info.id) setStreamId(info.id);
  setHlsUrl(info.hlsUrl || (info.id ? streaming.hlsFor(info.id) : streaming.hlsFor(info.key)));
    } catch (e: unknown) {
      const isErr = (val: unknown): val is { message?: string } => typeof val === 'object' && val !== null;
      const msg = isErr(e) && typeof (e as { message?: string }).message === 'string' ? e.message! : 'Failed to create ingest';
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  // Overlay link must use streamId, not streamKey
  const overlayUrl = useMemo(() => (streamId ? `/watch/${encodeURIComponent(streamId)}` : ""), [streamId]);

  // Camera/screen preview controls
  async function startCamera() {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      camStreamRef.current = ms;
      if (camRef.current) {
        camRef.current.srcObject = ms;
        await camRef.current.play();
      }
    } catch { setError('Failed to start camera'); }
  }
  function stopCamera() {
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current = null;
    if (camRef.current) camRef.current.srcObject = null;
  }
  async function startScreen() {
    try {
      type MediaDevicesWithDisplay = MediaDevices & { getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream> };
      const media = navigator.mediaDevices as MediaDevicesWithDisplay;
      const ms: MediaStream = typeof media.getDisplayMedia === 'function'
        ? await media.getDisplayMedia({ video: true, audio: true })
        : await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      screenStreamRef.current = ms;
      if (screenRef.current) {
        screenRef.current.srcObject = ms;
        await screenRef.current.play();
      }
    } catch { setError('Failed to start screen share'); }
  }
  function stopScreen() {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    if (screenRef.current) screenRef.current.srcObject = null;
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">My Stream</h1>

      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <strong>Wallet:</strong>
          <code className="ml-1">{address ?? "Not connected"}</code>
          <Button variant="outline" className="ml-auto" onClick={onConnect}>
            {address ? "Reconnect" : "Connect Wallet"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Stream</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">Status: <span className={status === 'LIVE' ? 'text-green-600' : 'text-muted-foreground'}>{status}</span></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Ingest URL</div>
              <Input readOnly value={streamKey ? "rtmp://localhost:1935/live" : ""} placeholder="Click Create to get ingest" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Stream Key</div>
              <Input readOnly value={streamKey} placeholder="Create to generate" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={createIngest} disabled={creating || !address}>
              {creating ? "Creating..." : "Create / Fetch Ingest"}
            </Button>
            <Button
              variant={status === 'LIVE' ? 'destructive' : 'default'}
        disabled={!streamId}
              onClick={async () => {
                try {
                  const headers = await getAuthHeaders();
                  const path = status === 'LIVE' ? 'stop' : 'start';
          const r = await fetch(`/api/stream/${encodeURIComponent(String(streamId))}/${path}`, { method: 'POST', headers, credentials: 'include' });
                  if (r.ok) {
                    const j = await r.json();
                    if (j?.status) setStatus(j.status);
                    if (j?.status === 'LIVE' && overlayUrl) window.open(overlayUrl, '_blank');
                  }
                } catch {}
              }}
            >
              {status === 'LIVE' ? 'Stop' : 'Start'} Stream
            </Button>
            {hlsUrl && (
              <a href={overlayUrl} target="_blank" rel="noreferrer">
                <Button variant="outline">Open Overlay</Button>
              </a>
            )}
            {overlayUrl && (
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(window.location.origin + overlayUrl)}
              >
                Copy Overlay Link
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {hlsUrl && <p className="text-xs text-muted-foreground">Share the overlay link with your audience.</p>}
          <p className="text-xs text-muted-foreground">Tip: Use OBS or any RTMP encoder with the given Ingest URL and Stream Key.</p>
        </CardContent>
      </Card>

      <UICard className="p-3 space-y-3">
        <div className="font-medium">Preview (Camera / Screen)</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={startCamera}>Start Camera</Button>
              <Button size="sm" variant="outline" onClick={stopCamera}>Stop</Button>
            </div>
            <video ref={camRef} className="w-full aspect-video rounded-md bg-black" muted playsInline controls={false} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={startScreen}>Share Screen</Button>
              <Button size="sm" variant="outline" onClick={stopScreen}>Stop</Button>
            </div>
            <video ref={screenRef} className="w-full aspect-video rounded-md bg-black" muted playsInline controls={false} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">This is a local preview. To go live, use an RTMP encoder (e.g. OBS) pointing to your ingest URL with the stream key.</p>
      </UICard>

      <UICard className="p-3">
        <div className="flex items-center gap-4">
          <div className="text-sm">Live viewers: <span className="font-medium">{viewerCount}</span></div>
          <div className="ml-auto flex items-center gap-2">
            <UIInput placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
            <Button size="sm" onClick={() => admin.muteUser(targetUserId)}>Mute</Button>
            <Button size="sm" variant="destructive" onClick={() => admin.banUser(targetUserId)}>Ban</Button>
          </div>
        </div>
      </UICard>

      <UICard className="p-3">
        <div className="font-medium mb-2">Chat</div>
        <div className="max-h-64 overflow-auto space-y-1 mb-2">
          {chat.map((m) => (
            <div key={m.id} className="text-sm"><span className="text-muted-foreground mr-2">{m.user.slice(0,6)}:</span>{m.text}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Send an announcement" />
          <Button onClick={async () => {
            const t = text.trim();
            if (!t) return;
            setText("");
            try {
              if (!streamId) return;
              const token = JSON.parse(localStorage.getItem('streamfi-auth') || '{}').state?.session?.token;
              const csrfRes = await fetch(`/api/csrf`, { credentials: 'include' });
              const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
              const res = await fetch(`/api/chat/${encodeURIComponent(String(streamId))}/messages`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
                body: JSON.stringify({ text: t }),
              });
              if (res.ok) {
                const data = await res.json() as { item: { _id: string; userId: string; text: string; createdAt: string } };
                setChat((c) => [...c, { id: data.item._id, user: data.item.userId, text: data.item.text, at: new Date(data.item.createdAt).getTime() }]);
              }
            } catch {}
          }}>Send</Button>
        </div>
      </UICard>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custom Reactions</CardTitle>
            <Button variant="outline" onClick={openAdd}>Add Reaction</Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">No reactions yet. Add one to get started.</p>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            {rules.map((r, idx) => (
              <div key={r.key} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.key}</div>
                </div>
                <label className="block text-xs mb-1">Price (paise)</label>
                <Input
                  type="number"
                  min={0}
                  value={r.priceInPaise}
                  onChange={(e) => updateRule(idx, Number(e.target.value))}
                />
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeReaction(r.key)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Audience will see these in Watch overlay and pay the set price.</p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Reaction" : "Add Reaction"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Key</label>
              <Input
                placeholder="like"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.trim().toLowerCase() }))}
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Label</label>
              <Input
                placeholder="👍 Like"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Price (paise)</label>
              <Input
                type="number"
                min={0}
                value={form.priceInPaise}
                onChange={(e) => setForm((f) => ({ ...f, priceInPaise: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveReaction}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
