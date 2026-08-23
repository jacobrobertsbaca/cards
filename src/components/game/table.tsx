"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { isLegalPlay, trickWinner } from "@/lib/game/engine"
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
import { PlayingCard } from "./playing-card"
import { PlayerSeat, slotFor } from "./player-seat"
import { Scoreboard } from "./score-sheet"
import { DealOverlay } from "./deal-overlay"
import { TrickPile } from "./trick-pile"

export function GameTable({
  code,
  state,
  mySeat,
  spectating,
  onlineIds,
  motion,
  onPlay,
  onAdvanceTrick,
  onRename,
}: {
  code: string
  state: GameState
  mySeat: number | null
  spectating: boolean
  onlineIds: string[]
  motion: TableMotion
  onPlay: (card: Card) => void
  onAdvanceTrick?: () => void
  onRename: (title: string) => void
}) {
  const anchor = mySeat ?? 0
  const count = state.settings.seatCount
  const clearing = state.phase === "game-over"
  const trickWinnerSeat =
    state.phase === "trick-end" && state.lastTrick.length > 0
      ? trickWinner(state.lastTrick, state.trump)
      : null

  return (
    <div className="felt relative h-svh w-full overflow-hidden">
      <header className="absolute top-3 left-12 right-4 z-20 flex items-start justify-between gap-4 text-white/80 md:left-4">
        <div>
          <TitleEditor title={displayGameTitle(state.title)} onRename={onRename} />
          <p className="max-w-md text-xs text-white/55">{rulesLine(state.settings)}</p>
          <CopyLink code={code} />
        </div>
      </header>

      {state.trump && motion.trumpReady && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-3 left-3 z-20 flex flex-col items-center",
            clearing && "table-clear"
          )}
        >
          <div className="rounded-lg shadow-[0_0_14px_rgb(251_191_36/0.14)] ring-2 ring-amber-200/70 ring-offset-2 ring-offset-[#16352b]">
            <PlayingCard card={state.trump} size="md" />
          </div>
          <p className="mt-1.5 text-[10px] font-medium tracking-[0.22em] text-amber-100/80 uppercase">
            Trump
          </p>
        </div>
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
        onContinue={
          state.phase === "trick-end" && !motion.trickLeaving
            ? onAdvanceTrick
            : undefined
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
            clearing={clearing}
            wonTrick={trickWinnerSeat === seat.index}
            onPlay={
              self &&
              state.phase === "playing" &&
              !motion.dealing &&
              !motion.trickLeaving
                ? (card) => {
                    if (isLegalPlay(state, seat.index, card)) onPlay(card)
                  }
                : undefined
            }
          />
        )
      })}

      <DealOverlay
        shuffling={motion.shuffling}
        flights={motion.flights}
        trump={state.trump}
      />
      <Scoreboard state={state} />
    </div>
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
        className="pointer-events-auto mt-1.5 flex size-6 items-center justify-center rounded-md text-white/55 hover:bg-white/10 hover:text-white"
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

