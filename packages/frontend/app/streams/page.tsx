"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { users, type LiveStream } from "@/modules/users";
import { Card, CardContent } from "@/components/ui/card";

export default function StreamsPage() {
  const [items, setItems] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    users
      .liveStreams()
      .then((r) => setItems(r.items || []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Live Streams</h1>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No live streams right now.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Link key={s._id} href={`/watch/${encodeURIComponent(s._id)}`}>
              <Card className="overflow-hidden hover:shadow">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium truncate max-w-[16rem]">{s.title || "Live"}</div>
                      <div className="text-muted-foreground text-xs">{new Date(s.createdAt || Date.now()).toLocaleString()}</div>
                    </div>
                    <div className="text-xs bg-secondary px-2 py-1 rounded-md">{s.viewers ?? 0} watching</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {err && <p className="text-sm text-destructive mt-2">{err}</p>}
    </main>
  );
}
