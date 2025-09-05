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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2 py-2 text-sm font-semibold">StreamFi</div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
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