"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "../../../stores/auth-store"
import { Card } from "../../../components/ui/card"
import { API_BASE } from "@/lib/api"

export default function NotificationsPage() {
  const session = useAuthStore((s) => s.session)
  const router = useRouter()
  const [items, setItems] = useState<Array<{ _id: string; kind: string; title: string; body?: string; createdAt?: string }>>([])
  useEffect(() => { if (!session) router.replace("/auth") }, [session, router])
  useEffect(() => {
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('streamfi-auth') || '{}')?.state?.session?.token : undefined
        const res = await fetch(`${API_BASE}/notifications`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, credentials: 'include' })
        if (res.ok) {
          const data = await res.json() as { items: Array<{ _id: string; kind: string; title: string; body?: string; createdAt?: string }> }
          setItems(data.items || [])
        }
      } catch {}
    })()
  }, [])
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      {items.length === 0 ? (
        <Card className="p-4">No notifications yet.</Card>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <Card key={n._id} className="p-3">
              <div className="text-sm font-medium">{n.title}</div>
              {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
              <div className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt || Date.now()).toLocaleString()}</div>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
