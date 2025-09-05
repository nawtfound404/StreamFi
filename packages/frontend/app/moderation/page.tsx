"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { admin } from "@/modules/admin";

export default function ModerationPanel() {
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<string>("");
  async function mute() { setStatus((await admin.muteUser(userId)) ? "Muted" : "Failed"); }
  async function ban() { setStatus((await admin.banUser(userId)) ? "Banned" : "Failed"); }
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Moderation</h1>
      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <Button onClick={mute}>Mute</Button>
            <Button variant="destructive" onClick={ban}>Ban</Button>
          </div>
          {status && <div className="text-sm">{status}</div>}
        </CardContent>
      </Card>
    </main>
  );
}
