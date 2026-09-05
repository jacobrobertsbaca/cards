"use client"

import { useState, type MouseEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Check, Pencil, Plus, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useGameSettingsApi } from "@/components/game/settings-context"
import { SidebarToggleIcon } from "@/components/sidebar-toggle-icon"
import { useHistory } from "@/hooks/use-history"
import { useIdentity } from "@/hooks/use-identity"
import { displayGameTitle } from "@/lib/game/title"
import { historyTooltip } from "@/lib/game/rules"
import { forgetGame } from "@/lib/history"
import { setDisplayName } from "@/lib/identity"
import { cn } from "@/lib/utils"

export const SIDEBAR_WIDTH = "w-56"
export const SIDEBAR_EXPANDED_INSET = "14rem"
export const SIDEBAR_RAIL_INSET = "2.5rem"
export const SIDEBAR_HOVER_TRIGGER = "w-2.5"
const ROW_HOVER =
  "rounded-md transition-colors hover:bg-white/10 active:bg-white/15"
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"

export function AppSidebar({
  mobileOpen,
  onMobileOpenChange,
  pinned,
  onPinnedChange,
}: {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  pinned: boolean
  onPinnedChange: (pinned: boolean) => void
}) {
  const [hovered, setHovered] = useState(false)
  const expanded = pinned || hovered

  function openHover() {
    setHovered(true)
  }

  function closeHover(event: MouseEvent<HTMLDivElement>) {
    if (pinned) return
    const panel = event.currentTarget
    const related = event.relatedTarget
    if (related instanceof Node && panel.contains(related)) return

    const { clientX, clientY } = event
    window.requestAnimationFrame(() => {
      if (pinned) return
      const under = document.elementFromPoint(clientX, clientY)
      if (
        under &&
        (panel.contains(under) ||
          under.closest('[data-slot="tooltip-content"]'))
      ) {
        return
      }
      setHovered(false)
    })
  }

  function togglePinned() {
    onPinnedChange(!pinned)
  }

  return (
    <>
      <div
        onMouseEnter={openHover}
        onMouseLeave={closeHover}
        className={cn(
          "fixed top-0 left-0 z-40 hidden h-svh overflow-hidden md:block",
          "transition-[width] duration-200 ease-out",
          expanded ? SIDEBAR_WIDTH : "pointer-events-none w-10"
        )}
      >
        {!expanded && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-auto absolute inset-y-0 left-0 z-10",
              SIDEBAR_HOVER_TRIGGER
            )}
            onMouseEnter={openHover}
          />
        )}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 border-r border-white/10 bg-[#10261d] shadow-2xl shadow-black/40 transition-opacity duration-200 ease-out",
            expanded ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />

        <div className="relative flex h-full w-56 flex-col text-white">
          <div
            className={cn(
              "flex w-10 shrink-0 justify-center p-1",
              !expanded && "pointer-events-auto"
            )}
            onMouseEnter={!expanded ? openHover : undefined}
          >
            <button
              type="button"
              onClick={togglePinned}
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              aria-expanded={expanded}
              className={cn(
                "relative z-20 flex size-8 items-center justify-center rounded-md text-white/70 hover:text-white",
                ROW_HOVER,
                FOCUS_RING
              )}
            >
              <SidebarToggleIcon pinned={pinned} />
            </button>
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-150 ease-out",
              expanded
                ? "opacity-100 delay-75"
                : "pointer-events-none opacity-0 delay-0"
            )}
          >
            <SidebarBody
              expanded={expanded}
              onNavigate={() => {
                onMobileOpenChange(false)
                if (!pinned) setHovered(false)
              }}
            />
          </div>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 border-white/10 bg-[#10261d] p-0 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="pt-2">
            <SidebarBody expanded onNavigate={() => onMobileOpenChange(false)} />
          </div>
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
  const settings = useGameSettingsApi()

  function hideGame(code: string) {
    if (pathname === `/${code}`) router.push("/")
    forgetGame(code)
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="px-1.5 py-0.5">
        <SidebarRow
          href="/"
          active={pathname === "/"}
          icon={<Plus className="size-3" />}
          label="New game"
          expanded={expanded}
          onNavigate={onNavigate}
        />
        {settings && (
          <SidebarAction
            icon={<Settings className="size-3" />}
            label="Settings"
            expanded={expanded}
            onClick={() => {
              settings.open()
              onNavigate?.()
            }}
          />
        )}
      </div>

      <div className="py-1.5">
        <div className="h-px bg-white/15" />
      </div>

      <ScrollArea className="min-w-0 flex-1 px-1.5 pb-2">
        <div className="py-0.5">
          {games.map((game) => {
            const title = displayGameTitle(game.title, game.startedAt)
            return (
              <SidebarRow
                key={game.code}
                href={`/${game.code}`}
                active={pathname === `/${game.code}`}
                icon={
                  <span className="text-[9px] font-medium opacity-70">
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

      <div className="py-1.5">
        <div className="h-px bg-white/15" />
      </div>

      <div className="px-1.5 pb-1.5">
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
    <div className="group/row relative flex min-w-0 items-center">
      <Link
        href={href}
        onClick={onNavigate}
        title={expanded ? undefined : title}
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center gap-1.5 px-1.5 text-[13px] leading-none",
          onRemove && "pr-7",
          ROW_HOVER,
          FOCUS_RING,
          active && "bg-white/15"
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {icon}
        </span>
        {expanded && <span className="min-w-0 flex-1 truncate">{label}</span>}
      </Link>
      {expanded && onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className={cn(
            "absolute right-1.5 flex size-5 shrink-0 items-center justify-center rounded-md text-white/45 opacity-70 transition-opacity hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover/row:opacity-100",
            FOCUS_RING
          )}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

function SidebarAction({
  icon,
  label,
  expanded,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  expanded: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={expanded ? undefined : label}
      className={cn(
        "flex h-8 w-full min-w-0 items-center gap-1.5 px-1.5 text-left text-[13px] leading-none",
        ROW_HOVER,
        FOCUS_RING
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      {expanded && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </button>
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
        className="flex h-8 min-w-0 items-center gap-1 overflow-hidden"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[9px] font-medium">
          {initials(name)}
        </span>
        <Input
          value={draft ?? ""}
          autoFocus
          maxLength={24}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          className="h-7 border-white/10 bg-white/5 text-[13px] text-white"
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
      className={cn(
        "flex h-8 w-full min-w-0 items-center gap-1.5 px-1.5 text-left text-[13px] leading-none",
        ROW_HOVER,
        FOCUS_RING
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[9px] font-medium">
        {initials(name)}
      </span>
      {expanded && (
        <>
          <span className="min-w-0 flex-1 truncate">{name || "…"}</span>
          <Pencil className="size-3 shrink-0 opacity-40" />
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
