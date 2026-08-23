"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { cardsThisRound, legalBids, ranking } from "@/lib/game/engine"
import type { GameState } from "@/lib/game/types"
import { cn } from "@/lib/utils"

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
  const [picked, setPicked] = useState<number | null>(null)

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(13.25rem+env(safe-area-inset-bottom,0px))] z-20 flex justify-center px-2 md:bottom-[15rem]">
      <div className="flex w-full max-w-[min(24rem,calc(100vw-1rem))] items-center justify-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full bg-black/25 p-1 backdrop-blur-sm md:flex-none md:gap-1.5 md:p-1.5">
          {Array.from({ length: cardsThisRound(state) + 1 }, (_, bid) => {
            const legal = options.includes(bid)
            const selected = picked === bid
            return (
              <button
                key={bid}
                type="button"
                disabled={!legal}
                aria-pressed={selected}
                onClick={() => setPicked(bid)}
                className={cn(
                  "aspect-square min-h-7 min-w-6 max-w-9 flex-1 touch-manipulation rounded-full text-xs transition-colors md:size-9 md:min-h-9 md:min-w-9 md:flex-none md:text-sm",
                  !legal && "cursor-not-allowed text-white opacity-25",
                  legal && !selected && "text-white hover:bg-white/20",
                  selected && "bg-white text-[#16352b] shadow-sm"
                )}
              >
                {bid}
              </button>
            )
          })}
        </div>
        {picked !== null && (
          <button
            type="button"
            aria-label={`Confirm bid ${picked}`}
            onClick={() => onBid(picked)}
            className="bid-check flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full bg-amber-200 text-[#16352b] shadow-[0_0_0_1px_rgb(251_191_36/0.45)] hover:bg-amber-100 md:size-9"
          >
            <Check className="size-3.5 md:size-4" strokeWidth={2.75} />
          </button>
        )}
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
