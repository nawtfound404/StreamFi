import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <Badge variant="outline" className="mb-6 text-cyan-400 border-cyan-500">Web3 Streaming Reimagined</Badge>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          Own Your Stream. <span className="text-cyan-400">Monetize</span> with Web3.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl">
          StreamFi lets creators monetize their content with crypto payments, NFTs, and real-time interactivity — built for the new creator economy.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-400 text-lg px-8 py-6 rounded-xl">
              Get Started
            </Button>
          </Link>
          <Link href="/watch">
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 text-lg px-8 py-6 rounded-xl">
              Explore Streams
            </Button>
          </Link>
        </div>
      </section>

      <Separator className="my-12 bg-slate-800" />

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
        <Card className="bg-black/40 border-slate-800">
          <CardHeader>
            <CardTitle>💸 Web3 Monetization</CardTitle>
            <CardDescription>Instant crypto payments with no middlemen.</CardDescription>
          </CardHeader>
          <CardContent>
            Accept donations directly from viewers and unlock new revenue streams.
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-slate-800">
          <CardHeader>
            <CardTitle>🎟 NFT Integration</CardTitle>
            <CardDescription>Reward fans with real digital ownership.</CardDescription>
          </CardHeader>
          <CardContent>
            Distribute collectibles and exclusive access through on-chain assets.
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-slate-800">
          <CardHeader>
            <CardTitle>⚡ Real-Time Interactivity</CardTitle>
            <CardDescription>Make streaming a two-way experience.</CardDescription>
          </CardHeader>
          <CardContent>
            Engage with live chat, reactions, and microtransactions built-in.
          </CardContent>
        </Card>
      </section>

      <Separator className="my-12 bg-slate-800" />

      {/* About Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Why StreamFi?</h2>
        <p className="text-lg text-slate-300 mb-8">
          StreamFi empowers creators, viewers, and developers with an open, secure, and scalable streaming platform.
        </p>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div>
            <h3 className="font-semibold text-xl mb-2">For Creators</h3>
            <p className="text-slate-400">Unlock revenue streams, build a loyal community, and own your brand in Web3.</p>
          </div>
          <div>
            <h3 className="font-semibold text-xl mb-2">For Viewers</h3>
            <p className="text-slate-400">Support your favorite creators transparently and earn rewards.</p>
          </div>
          <div>
            <h3 className="font-semibold text-xl mb-2">For Developers</h3>
            <p className="text-slate-400">Extend, integrate, or self-host — built on open standards and ready for innovation.</p>
          </div>
        </div>
      </section>

      <Separator className="my-12 bg-slate-800" />

      {/* Footer */}
      <footer className="py-10 text-center text-slate-500 text-sm">
        Built with ♡ by team <span className="text-cyan-400 font-medium">NexusCore</span> • © {new Date().getFullYear()} StreamFi
      </footer>
    </main>
  )
}
