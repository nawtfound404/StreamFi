"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { users } from "@/modules/users";
import { useAuthStore } from "@/stores/auth-store";
import { connectWallet, getAccounts } from "@/lib/wallet";

export default function SettingsPage() {
  const session = useAuthStore((s) => s.session);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"STREAMER" | "AUDIENCE">("AUDIENCE");
  const [status, setStatus] = useState<string>("");
  const [wallet, setWallet] = useState<string | null>(null);

  useEffect(() => {
    getAccounts().then((a) => setWallet(a[0] ?? null)).catch(() => {});
  }, []);

  async function saveUsername() {
    try {
      setStatus("Saving username…");
      await users.setUsername(username.trim());
      setStatus("Username saved");
    } catch (e) { setStatus(String(e)); }
  }
  async function switchRole() {
    try {
      setStatus("Switching role…");
      await users.setRole(role);
      setStatus("Role updated");
    } catch (e) { setStatus(String(e)); }
  }
  async function lockWallet() {
    try {
      const addr = await connectWallet();
      if (!addr) { setStatus("Wallet connect failed"); return; }
      setWallet(addr);
      // Call vault create to lock wallet to user
      const csrfRes = await fetch(`/api/csrf`, { credentials: 'include' });
      const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined;
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined;
      const res = await fetch(`/api/vaults`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) }, body: JSON.stringify({ walletAddress: addr }) });
      if (!res.ok) throw new Error(await res.text());
      setStatus("Wallet locked to your account");
    } catch (e) { setStatus(String(e)); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      {!session && <p className="text-sm text-muted-foreground">Sign in to manage your profile.</p>}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Username</div>
            <div className="flex gap-2">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" />
              <Button onClick={saveUsername} disabled={!session}>Save</Button>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Role</div>
            <div className="flex gap-2">
              <select aria-label="Role" className="border rounded-md px-2 py-1" value={role} onChange={(e) => setRole(e.target.value as "STREAMER" | "AUDIENCE")}>
                <option value="AUDIENCE">Audience</option>
                <option value="STREAMER">Streamer</option>
              </select>
              <Button onClick={switchRole} disabled={!session}>Update</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Wallet</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">Connected: <code>{wallet ?? 'Not connected'}</code></div>
          <Button variant="outline" onClick={lockWallet} disabled={!session}>Connect & Lock to Account</Button>
          <p className="text-xs text-muted-foreground">Once locked, only this account can use the wallet with StreamFi services.</p>
        </CardContent>
      </Card>

      {status && <p className="text-sm">{status}</p>}
    </main>
  );
}
