"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "../../../stores/auth-store"
import { Card } from "../../../components/ui/card"

export default function NotificationsPage() {
  const session = useAuthStore((s) => s.session)
  const router = useRouter()
  useEffect(() => { if (!session) router.replace("/auth") }, [session, router])
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <Card className="p-4">No notifications yet.</Card>
    </main>
  )
}
