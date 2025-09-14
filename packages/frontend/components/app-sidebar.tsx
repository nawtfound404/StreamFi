"use client"

import * as React from "react"
import { Tv, LayoutDashboard, Shield, Settings, DollarSign, Home, LogIn } from "lucide-react"
import { NavMain } from "../components/nav-main"
import { NavUser } from "../components/nav-user"
import { useAuthStore } from "../stores/auth-store"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "../components/ui/sidebar"

// --- ADD THIS IMPORT ---
import { ConnectButton } from "@rainbow-me/rainbowkit"

type Role = "STREAMER" | "AUDIENCE" | "ADMIN" | "streamer" | "viewer" | "admin" | null;

const data = {
  user: {
    name: "Streamer",
    email: "demo@streamfi.dev",
    avatar: "https://github.com/shadcn.png",
  },
  teams: [],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
      items: [],
    },
    {
      title: "Streams",
      url: "/streams", // Parent goes to list of live streams
      icon: Tv,
      items: [
        { title: "Live", url: "/streams" },
        { title: "My Stream", url: "/streamer" },
      ],
    },
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, items: [] },
    { title: "Analytics", url: "/dashboard/analytics", icon: LayoutDashboard, items: [] },
    { title: "Notifications", url: "/dashboard/notifications", icon: LayoutDashboard, items: [] },
    {
      title: "Monetization",
      url: "/dashboard/monetization",
      icon: DollarSign,
      items: [
        { title: "Donations", url: "/dashboard/monetization" },
        { title: "NFTs", url: "/dashboard/monetization#nfts" },
      ],
    },
    {
      title: "Admin",
      url: "/admin",
      icon: Shield,
      items: [
        { title: "Moderation", url: "/admin" },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
      items: [],
    },
  ],
  projects: [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const session = useAuthStore((s) => s.session)
  const signOut = useAuthStore((s) => s.signOut)
  const user = session ? { name: session.userId, email: `${session.userId}@streamfi`, avatar: "https://github.com/shadcn.png" } : data.user
  const role = (session?.role || null) as Role;
  // Filter nav based on role
  const nav = data.navMain.filter((item) => {
    if (item.title === 'Admin') return role === 'ADMIN' || role === 'admin';
    if (item.title === 'Streams') return true; // both can see
    if (item.title === 'Dashboard' || item.title === 'Notifications' || item.title === 'Settings') return true;
    if (item.title === 'Monetization') return role === 'STREAMER' || role === 'streamer' || role === 'ADMIN' || role === 'admin';
    return true;
  }).map((item) => {
    if (item.title === 'Streams') {
      const filtered = { ...item } as typeof item;
      filtered.items = (item.items || []).filter((sub) => {
        if (sub.title === 'My Stream') return role === 'STREAMER' || role === 'streamer' || role === 'ADMIN' || role === 'admin';
        return true;
      });
      return filtered;
    }
    return item;
  });
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2 py-2 text-sm font-semibold">StreamFi</div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={nav} />
      </SidebarContent>
      <SidebarFooter>
        {/* --- ADD THE CONNECT BUTTON HERE --- */}
        <div className="p-2 flex justify-center">
          <ConnectButton />
        </div>
        {session ? (
          <NavUser user={user} onLogout={signOut} />
        ) : (
          <div className="p-2">
            <Link href="/auth" className="block">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                aria-label="Login"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            </Link>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}