"use client"

import * as React from "react"
import { Tv, LayoutDashboard, Shield, Settings, DollarSign, Home } from "lucide-react"
import { NavMain } from "../components/nav-main"
import { NavUser } from "../components/nav-user"
import { useAuthStore } from "../stores/auth-store"
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
  const canStream = role === 'STREAMER' || role === 'streamer' || role === 'ADMIN' || role === 'admin'
  // Filter nav based on role (but keep "My Stream" visible in the menu; route access is still gated)
  const nav = data.navMain.filter((item) => {
    if (item.title === 'Admin') return role === 'ADMIN' || role === 'admin';
    if (item.title === 'Streams') return true; // both can see
    if (item.title === 'Dashboard' || item.title === 'Notifications' || item.title === 'Settings') return true;
    if (item.title === 'Monetization') return canStream;
    return true;
  }).map((item) => {
    if (item.title === 'Streams') {
      const filtered = { ...item, isActive: canStream } as typeof item & { isActive?: boolean };
      // Always show "My Stream" in the menu; non-streamers will be redirected by AuthGate if they click it
      filtered.items = item.items || [];
      return filtered;
    }
    return item;
  });

  // Ensure a prominent top-level "My Stream" entry for eligible users
  if (/* also surface as top-level for convenience when eligible */ canStream && !nav.some((i) => i.url === '/streamer')) {
    // Insert after Home if present, otherwise append
    const homeIndex = nav.findIndex((i) => i.title === 'Home')
    const myStreamItem = { title: 'My Stream', url: '/streamer', icon: Tv, items: [] as any[] }
    if (homeIndex >= 0) nav.splice(homeIndex + 1, 0, myStreamItem)
    else nav.push(myStreamItem)
  }
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
        <NavUser user={user} onLogout={signOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}