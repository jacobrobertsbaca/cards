"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { trickWinner } from "@/lib/game/engine"
import { rulesLine } from "@/lib/game/rules"
import { displayGameTitle } from "@/lib/game/title"
import type { Card, GameState } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { TableMotion } from "@/hooks/use-table-motion"
import { PlayerSeat, slotFor } from "./player-seat"
import { Scoreboard } from "./score-sheet"
import { DealOverlay } from "./deal-overlay"
import { PlayOriginProvider } from "./play-origin"
import { TrickPile } from "./trick-pile"
import { TrumpSpot } from "./trump-reveal"

export function GameTable({
  code,
  state,
  mySeat,
  spectating,
  onlineIds,
  motion,
  onPlay,
  onRename,
}: {
  code: string
  state: GameState
  mySeat: number | null
  spectating: boolean
  onlineIds: string[]
  motion: TableMotion
  onPlay: (card: Card) => void | Promise<void | boolean>
  onRename: (title: string) => void
}) {
  const anchor = mySeat ?? 0
  const count = state.settings.seatCount
  const waiting =
    (state.phase === "trick-end" && !motion.trickLeaving) ||
    state.phase === "round-end"
  const trickWinnerSeat =
    state.phase === "trick-end" && state.lastTrick.length > 0
      ? trickWinner(state.lastTrick, state.trump)
      : null

  return (
    <PlayOriginProvider>
    <div
      className={cn(
        "felt relative h-full min-h-0 w-full overflow-hidden overscroll-none",
        waiting && "cursor-pointer"
      )}
    >
      <header className="pointer-events-none absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] left-[max(3.25rem,env(safe-area-inset-left))] z-20 flex items-start justify-between gap-4 text-white/80 md:left-4">
        <div className="hidden min-w-0 md:block">
          <TitleEditor title={displayGameTitle(state.title)} onRename={onRename} />
          <p className="max-w-md text-xs text-white/55">{rulesLine(state.settings)}</p>
        </div>
        <CopyLink code={code} />
      </header>

      {state.trump && motion.trumpPhase !== "hidden" && (
        <TrumpSpot
          card={state.trump}
          phase={motion.trumpPhase}
        />
      )}

      <TrickPile
        plays={motion.trick}
        leaving={motion.trickLeaving}
        winnerSeat={motion.trickWinnerSeat ?? trickWinnerSeat}
        mySeat={anchor}
        seatCount={count}
        highlightWinner={state.phase === "trick-end" && !motion.trickLeaving}
        takenByUs={
          mySeat === null ||
          (motion.trickWinnerSeat ?? trickWinnerSeat) === mySeat
        }
      />

      {state.seats.map((seat) => {
        const relative = (seat.index - anchor + count) % count
        const slot = slotFor(count, relative)
        const self = seat.index === mySeat
        return (
          <PlayerSeat
            key={seat.index}
            seat={seat}
            state={state}
            slot={slot}
            self={self}
            spectating={spectating}
            online={seat.playerId ? onlineIds.includes(seat.playerId) : false}
            revealCount={motion.dealing ? motion.revealed[seat.index] : undefined}
            dealing={motion.dealing}
            wonTrick={trickWinnerSeat === seat.index}
            onPlay={
              self &&
              (state.phase === "playing" || state.phase === "bidding") &&
              !motion.dealing
                ? onPlay
                : undefined
            }
          />
        )
      })}

      <DealOverlay shuffling={motion.shuffling} />
      <Scoreboard state={state} />
    </div>
    </PlayOriginProvider>
  )
}

function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    const url = `${window.location.origin}${base}/${code}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        onClick={() => void copy()}
        aria-label={copied ? "Copied" : "Copy game link"}
        className="pointer-events-auto ml-auto flex size-9 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white md:size-6 md:text-white/55"
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {copied ? "Copied" : "Copy game link"}
      </TooltipContent>
    </Tooltip>
  )
}

function TitleEditor({
  title,
  onRename,
}: {
  title: string
  onRename: (title: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  function save() {
    if (draft !== null) onRename(draft)
    setDraft(null)
  }

  if (draft !== null) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <input
          value={draft}
          autoFocus
          maxLength={48}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          className="pointer-events-auto w-64 bg-transparent text-sm font-medium text-white outline-none"
        />
      </form>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        onClick={() => setDraft(title)}
        className="pointer-events-auto text-left text-sm font-medium text-white hover:text-white/80"
      >
        {title}
      </TooltipTrigger>
      <TooltipContent>Click to edit game name</TooltipContent>
    </Tooltip>
  )
}

