"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="felt min-h-svh text-white">
      <AppSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 text-white hover:bg-white/10 hover:text-white md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu />
      </Button>
      <div className="md:pl-10">{children}</div>
    </div>
  )
}
