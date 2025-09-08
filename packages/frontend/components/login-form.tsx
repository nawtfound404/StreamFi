"use client"
import { useState } from "react"
import { GalleryVerticalEnd } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { useRouter } from "next/navigation"
import { auth } from "../modules/auth"
import { useAuthStore } from "../stores/auth-store"
import { connectWallet } from "@/lib/wallet"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession)
  const [error, setError] = useState("")
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const form = e.currentTarget as HTMLFormElement
          const email = (form.elements.namedItem("email") as HTMLInputElement)?.value || ""
          const password = (form.elements.namedItem("password") as HTMLInputElement)?.value || ""
          const session = await auth.signIn({ email, password })
          if (!session) {
            setError("Invalid email or password")
            return
          }
          setSession(session)
          // Optional: auto-connect wallet and lock it on first login
          try {
            const addr = await connectWallet()
            if (addr) {
              const csrfRes = await fetch(`/api/csrf`, { credentials: 'include' })
              const csrfToken = csrfRes.ok ? (await csrfRes.json()).csrfToken as string : undefined
              await fetch(`/api/vaults`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) }, body: JSON.stringify({ walletAddress: addr }) })
            }
          } catch {}
          router.replace("/dashboard")
        }}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">StreamFi</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to StreamFi</h1>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="underline underline-offset-4">
                Sign up
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required />
            </div>
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
            <Button type="submit" className="w-full">
              Login
            </Button>
          </div>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Or
            </span>
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground text-center">You can connect your wallet later in Settings.</div>
          </div>
        </div>
      </form>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        Seeded login creds (local):
        <div className="mt-1">creator@streamfi.local / creator123</div>
        <div>admin@streamfi.local / admin123</div>
        <div className="mt-2">By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  )
}
