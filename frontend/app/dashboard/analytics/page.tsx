"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "../../../stores/auth-store"
import { Card } from "../../../components/ui/card"

export default function AnalyticsPage() {
  const session = useAuthStore((s) => s.session)
  const router = useRouter()
  useEffect(() => { if (!session) router.replace("/auth") }, [session, router])
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 min-h-40">Viewer Growth (placeholder)</Card>
        <Card className="p-4 min-h-40">Engagement (placeholder)</Card>
      </div>
    </main>
  )
}
