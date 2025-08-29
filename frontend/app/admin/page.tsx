"use client";
import { useState } from "react";
import { admin } from "../../modules/admin";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export default function AdminPage() {
  const [userId, setUserId] = useState("");
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold mb-4">Admin & Moderation</h1>
      <Card>
        <CardContent className="p-4 grid gap-3">
          <div className="text-sm text-muted-foreground">User moderation</div>
          <div className="flex gap-2">
            <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <Button onClick={() => admin.muteUser(userId)}>Mute</Button>
            <Button variant="secondary" onClick={() => admin.banUser(userId)}>Ban</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
