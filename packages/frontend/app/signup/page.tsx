"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { auth } from "../../modules/auth"
import { users } from "../../modules/users"
import { useAuthStore } from "../../stores/auth-store"

export default function SignupPage() {
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value || ""
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value || ""
    const role = (form.elements.namedItem("role") as HTMLSelectElement)?.value as 'STREAMER' | 'AUDIENCE' | ''
    setLoading(true)
    setError(null)
    try {
      const session = await auth.signUp({ email, password })
      setSession(session)
      try {
        if (session && (role === 'STREAMER' || role === 'AUDIENCE')) {
          await users.setRole(role)
        }
      } catch { /* ignore role error */ }
      router.replace("/dashboard")
    } catch (err: any) {
      setError(err?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="min-h-screen w-screen grid place-items-center p-4">
        <form className="w-full max-w-md space-y-6" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <select id="role" name="role" aria-label="Select role" className="mt-1 block w-full rounded-md border bg-background p-2">
              <option value="">Choose one (optional)</option>
              <option value="STREAMER">Creator</option>
              <option value="AUDIENCE">User</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
          {error && <div className="text-sm text-red-500 break-words">{error}</div>}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account? <a className="underline underline-offset-4" href="/auth">Sign in</a>
          </div>
        </form>
      </div>
    </div>
  )
}
