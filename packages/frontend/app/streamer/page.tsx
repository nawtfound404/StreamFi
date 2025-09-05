"use client";

import { useEffect, useMemo, useState } from "react";
import { connectWallet, getAccounts } from "@/lib/wallet";
import { streaming } from "@/modules/streaming";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ReactionRule = { key: string; label: string; priceInPaise: number };

export default function StreamerPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [streamKey, setStreamKey] = useState<string>("");
  const [hlsUrl, setHlsUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [rules, setRules] = useState<ReactionRule[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReactionRule | null>(null);
  const [form, setForm] = useState<ReactionRule>({ key: "", label: "", priceInPaise: 0 });

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
  }, []);

  async function onConnect() {
    const acc = await connectWallet();
    setAddress(acc);
  }

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
      setHlsUrl(info.hlsUrl || streaming.hlsFor(info.key));
    } catch (e: unknown) {
      const isErr = (val: unknown): val is { message?: string } => typeof val === 'object' && val !== null;
      const msg = isErr(e) && typeof (e as { message?: string }).message === 'string' ? e.message! : 'Failed to create ingest';
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  const overlayUrl = useMemo(() => (streamKey ? `/watch/${encodeURIComponent(streamKey)}` : ""), [streamKey]);

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
        </CardContent>
      </Card>

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
