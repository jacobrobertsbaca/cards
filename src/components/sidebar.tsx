"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Check, Pencil, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useHistory } from "@/hooks/use-history"
import { useIdentity } from "@/hooks/use-identity"
import { displayGameTitle } from "@/lib/game/title"
import { historyTooltip } from "@/lib/game/rules"
import { forgetGame } from "@/lib/history"
import { setDisplayName } from "@/lib/identity"
import { cn } from "@/lib/utils"

const RAIL = "w-10"
const TILE =
  "flex size-6 shrink-0 items-center justify-center rounded-md"

export function AppSidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}) {
  const [hovered, setHovered] = useState(false)
  const expanded = hovered

  return (
    <>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed top-0 left-0 z-40 hidden h-svh isolate overflow-hidden border-r border-white/10 bg-[#10261d] text-white transition-[width] duration-200 ease-out md:flex",
          expanded ? "w-64" : RAIL
        )}
      >
        <div className="flex h-full w-64 min-w-0 shrink-0 flex-col overflow-hidden">
          <SidebarBody expanded={expanded} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 border-white/10 bg-[#10261d] p-0 text-white"
          showCloseButton
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <SidebarBody expanded onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarBody({
  expanded,
  onNavigate,
}: {
  expanded: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const games = useHistory()
  const identity = useIdentity()

  function hideGame(code: string) {
    if (pathname === `/${code}`) router.push("/")
    forgetGame(code)
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="overflow-hidden pt-2.5">
        <SidebarRow
          href="/"
          active={pathname === "/"}
          icon={<Plus className="size-3.5" />}
          label="New game"
          expanded={expanded}
          onNavigate={onNavigate}
        />
        <div className="flex w-10 justify-center py-1.5">
          <div className="h-px w-5 bg-white/20" />
        </div>
      </div>

      <ScrollArea className="min-w-0 flex-1 overflow-hidden pb-3">
        <div className="overflow-hidden">
          {games.map((game) => {
            const title = displayGameTitle(game.title, game.startedAt)
            return (
              <SidebarRow
                key={game.code}
                href={`/${game.code}`}
                active={pathname === `/${game.code}`}
                icon={
                  <span className="text-[10px] font-medium opacity-70">
                    {title.slice(0, 1)}
                  </span>
                }
                label={title}
                title={historyTooltip(game.summary)}
                expanded={expanded}
                onNavigate={onNavigate}
                onRemove={() => hideGame(game.code)}
              />
            )
          })}
        </div>
      </ScrollArea>

      <div className="overflow-hidden border-t border-white/10">
        <NameEditor name={identity.name} expanded={expanded} />
      </div>
    </div>
  )
}

function SidebarRow({
  href,
  active,
  icon,
  label,
  title,
  expanded,
  onNavigate,
  onRemove,
}: {
  href: string
  active?: boolean
  icon: React.ReactNode
  label: string
  title?: string
  expanded: boolean
  onNavigate?: () => void
  onRemove?: () => void
}) {
  return (
    <div className="group/row flex h-9 w-full min-w-0 items-center overflow-hidden text-sm transition-colors hover:bg-white/5">
      <Link
        href={href}
        onClick={onNavigate}
        title={expanded ? undefined : title}
        className="flex h-full min-w-0 flex-1 items-center overflow-hidden"
      >
        <span className="flex w-10 shrink-0 items-center justify-center">
          <span className={cn(TILE, active && "bg-white/15")}>{icon}</span>
        </span>
        {expanded && (
          <span className="min-w-0 flex-1 truncate">{label}</span>
        )}
      </Link>
      {expanded && onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-md text-white/45 opacity-70 transition-opacity hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover/row:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function NameEditor({
  name,
  expanded,
}: {
  name: string
  expanded: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const editing = draft !== null && expanded

  function save() {
    if (draft !== null) setDisplayName(draft)
    setDraft(null)
  }

  if (editing) {
    return (
      <form
        className="flex h-9 min-w-0 items-center gap-1 overflow-hidden pr-2"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <span className="flex w-10 shrink-0 items-center justify-center">
          <span className={cn(TILE, "bg-white/10 text-[10px] font-medium")}>
            {initials(name)}
          </span>
        </span>
        <Input
          value={draft ?? ""}
          autoFocus
          maxLength={24}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          className="h-8 border-white/10 bg-white/5 text-white"
        />
        <Button type="submit" size="icon-sm" variant="ghost">
          <Check />
        </Button>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (expanded) setDraft(name)
      }}
      className="flex h-9 w-full min-w-0 items-center overflow-hidden text-left text-sm transition-colors hover:bg-white/5"
    >
      <span className="flex w-10 shrink-0 items-center justify-center">
        <span className={cn(TILE, "bg-white/10 text-[10px] font-medium")}>
          {initials(name)}
        </span>
      </span>
      {expanded && (
        <>
          <span className="min-w-0 flex-1 truncate">{name || "…"}</span>
          <Pencil className="mr-3 size-3.5 shrink-0 opacity-40" />
        </>
      )}
    </button>
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
}
