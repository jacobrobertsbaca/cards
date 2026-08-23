"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/sidebar"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const table = pathname !== "/"

  return (
    <div
      className={cn(
        "felt text-white",
        table ? "h-dvh overflow-hidden overscroll-none" : "min-h-svh"
      )}
    >
      <AppSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-[max(0.5rem,env(safe-area-inset-top))] left-[max(0.5rem,env(safe-area-inset-left))] z-50 text-white hover:bg-white/10 hover:text-white md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu />
      </Button>
      <div className={cn("md:pl-10", table && "h-full overflow-hidden")}>
        {children}
      </div>
    </div>
  )
}
