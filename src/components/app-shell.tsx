"use client"

import { useState, type CSSProperties } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AppSidebar,
  SIDEBAR_EXPANDED_INSET,
  SIDEBAR_RAIL_INSET,
} from "@/components/sidebar"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const pathname = usePathname()
  const table = pathname !== "/"

  return (
    <div
      className={cn(
        "felt text-white",
        table ? "h-dvh overflow-hidden overscroll-none" : "min-h-svh"
      )}
      style={
        {
          "--sidebar-offset": sidebarPinned ? SIDEBAR_EXPANDED_INSET : "0rem",
          "--header-left-pad": sidebarPinned ? "0.75rem" : "2.75rem",
          "--sidebar-content-pad": sidebarPinned ? "0rem" : SIDEBAR_RAIL_INSET,
        } as CSSProperties
      }
    >
      <AppSidebar
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        pinned={sidebarPinned}
        onPinnedChange={setSidebarPinned}
      />
      <div className="fixed top-0 left-0 z-50 pt-[max(0.5rem,env(safe-area-inset-top))] pl-[max(0.5rem,env(safe-area-inset-left))] md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="bg-[#16352b]/80 text-white backdrop-blur-md hover:bg-white/10 hover:text-white"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu />
        </Button>
      </div>
      <div
        className={cn(
          sidebarPinned && "md:pl-56",
          table && "h-full overflow-hidden"
        )}
      >
        {children}
      </div>
    </div>
  )
}
