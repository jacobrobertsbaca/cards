"use client"

import { Button } from "@/components/ui/button"
import {
  cardsThisRound,
  filledSeats,
  legalBids,
  ranking,
} from "@/lib/game/engine"
import { rulesLine } from "@/lib/game/rules"
import { displayGameTitle } from "@/lib/game/title"
import type { GameState } from "@/lib/game/types"
import { cn } from "@/lib/utils"

export function JoinOverlay({
  state,
  onJoin,
  onSpectate,
  busy,
  error,
}: {
  state: GameState
  onJoin: () => void
  onSpectate: () => void
  busy?: boolean
  error?: string | null
}) {
  const taken = filledSeats(state)
  const open = taken < state.settings.seatCount
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 px-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-[#f7f4ee] p-6 text-center text-[#2c261e] shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">
            {displayGameTitle(state.title)}
          </h1>
          <p className="text-sm text-[#6f675e]">{rulesLine(state.settings)}</p>
        </div>
        <p className="text-sm text-[#6f675e]">
          {taken}/{state.settings.seatCount} joined
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-center gap-2">
          {open && (
            <Button size="lg" onClick={onJoin} disabled={busy}>
              Join
            </Button>
          )}
          <Button size="lg" variant="outline" onClick={onSpectate}>
            Spectate
          </Button>
        </div>
      </div>
    </div>
  )
}

export function BidPanel({
  state,
  seat,
  onBid,
}: {
  state: GameState
  seat: number
  onBid: (bid: number) => void
}) {
  const options = legalBids(state, seat)
  return (
    <div className="pointer-events-auto absolute bottom-[11.5rem] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center">
      <div className="flex gap-1.5 rounded-full bg-black/25 p-1.5 backdrop-blur-sm">
        {Array.from({ length: cardsThisRound(state) + 1 }, (_, bid) => (
          <button
            key={bid}
            type="button"
            disabled={!options.includes(bid)}
            onClick={() => onBid(bid)}
            className={cn(
              "size-9 rounded-full text-sm text-white transition-colors",
              options.includes(bid)
                ? "hover:bg-white/20"
                : "cursor-not-allowed opacity-25"
            )}
          >
            {bid}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RoundEndOverlay({
  state,
  onContinue,
}: {
  state: GameState
  onContinue: () => void
}) {
  const last = state.history[state.history.length - 1]
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-black/45 via-black/10 to-transparent px-6 pb-8 pt-[42vh]">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-[#f7f4ee] p-6 text-[#2c261e] shadow-xl">
        <h2 className="text-lg font-medium">Round in</h2>
        <div className="space-y-1.5 text-sm">
          {state.seats.map((seat, index) => (
            <div key={seat.index} className="flex justify-between">
              <span>{seat.displayName}</span>
              <span className="font-mono text-[#6f675e]">
                {last?.tricks[index]}/{last?.bids[index]} · +{last?.scores[index]}
              </span>
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={onContinue}>
          Next round
        </Button>
      </div>
    </div>
  )
}

export function GameOverOverlay({ state }: { state: GameState }) {
  const standings = ranking(state)
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 px-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-[#f7f4ee] p-6 text-[#2c261e] shadow-xl">
        <h2 className="text-lg font-medium">Final table</h2>
        <div className="space-y-2">
          {standings.map((row, index) => (
            <div key={row.seat} className="flex items-baseline justify-between">
              <span>
                {index + 1}. {row.name}
              </span>
              <span className="font-mono">{row.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
