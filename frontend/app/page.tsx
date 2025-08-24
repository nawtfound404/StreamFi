import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <section className="grid gap-6 lg:grid-cols-2 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Live streaming, Web3, and real‑time interactivity in one platform
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-prose">
            StreamFi combines low‑latency streaming, donations, NFTs, and analytics
            with a clean, modern UI. Built with Next.js and shadcn-style components.
          </p>
          <div className="flex gap-3">
            <Link href="/streams" className="px-4 py-2 rounded-md bg-primary text-primary-foreground border">Browse streams</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-md border">Open dashboard</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[
              "Auth & Roles",
              "Streaming Core",
              "Viewer UI",
              "Realtime Chat",
              "Donations",
              "Blockchain/NFTs",
              "Notifications",
              "Analytics",
              "Admin",
            ].map((m) => (
              <div key={m} className="rounded-md border p-3 text-sm bg-card">
                {m}
              </div>
            ))}
          </div>
        </div>
        <div className="aspect-video rounded-xl border bg-muted/30" />
      </section>
    </main>
  );
}
