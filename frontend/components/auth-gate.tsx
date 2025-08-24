"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

// Centralized client-side auth gate: redirects to /auth when unauthenticated on protected routes,
// and redirects to /dashboard when authenticated on /auth or /signup.
export function AuthGate() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!pathname) return;
    const isPublic =
      pathname === "/" ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/streams");

    if (!session && !isPublic) {
      router.replace("/auth");
      return;
    }

    if (session && (pathname.startsWith("/auth") || pathname.startsWith("/signup"))) {
      router.replace("/dashboard");
    }
  }, [pathname, router, session]);

  return null;
}
