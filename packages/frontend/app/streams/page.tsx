export default function StreamsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Live Streams</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <div className="aspect-video bg-muted" />
            <div className="p-3">
              <div className="font-medium">Streamer {i + 1}</div>
              <div className="text-muted-foreground text-sm">Just chatting</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
