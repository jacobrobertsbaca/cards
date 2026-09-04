"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { cardsThisRound, legalBids } from "@/lib/game/actions"
import type { OhHellState } from "@/lib/oh-hell/types"
import { cn } from "@/lib/utils"
import { PopConfirmButton } from "./pop-confirm"

export function BidPanel({
  state,
  seat,
  onBid,
}: {
  state: OhHellState
  seat: number
  onBid: (bid: number) => void | Promise<void>
}) {
  const options = legalBids(state, seat)
  const [picked, setPicked] = useState<number | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(12rem+env(safe-area-inset-bottom,0px))] z-40 flex justify-center px-2 md:bottom-[15rem]">
      <div className="flex w-full max-w-[min(24rem,calc(100vw-1rem))] items-center justify-center gap-1.5">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full bg-black/25 p-1 backdrop-blur-sm md:flex-none md:gap-1.5 md:p-1.5",
            pending && "pointer-events-none opacity-55"
          )}
        >
          {Array.from({ length: cardsThisRound(state) + 1 }, (_, bid) => {
            const legal = options.includes(bid)
            const selected = picked === bid
            const takenBy = state.bids.flatMap((value, seat) =>
              value === bid ? [seat] : []
            )
            const taken = takenBy.length > 0
            return (
              <button
                key={bid}
                type="button"
                disabled={!legal || pending}
                aria-pressed={selected}
                title={
                  taken
                    ? `Already bid by ${takenBy
                        .map(
                          (seat) =>
                            state.seats[seat]?.displayName ?? `Player ${seat + 1}`
                        )
                        .join(", ")}`
                    : undefined
                }
                onClick={() => setPicked(bid)}
                className={cn(
                  "relative flex aspect-square min-h-7 min-w-6 max-w-9 flex-1 touch-manipulation items-center justify-center rounded-full text-xs transition-colors md:size-9 md:min-h-9 md:min-w-9 md:flex-none md:text-sm",
                  !legal && "cursor-not-allowed text-white opacity-25",
                  legal && !selected && "text-white hover:bg-white/20",
                  selected && "bg-white text-[#16352b] shadow-sm",
                  taken && "font-bold"
                )}
              >
                {bid}
              </button>
            )
          })}
        </div>
        <PopConfirmButton
          show={picked !== null}
          label={picked !== null ? `Confirm bid ${picked}` : "Confirm bid"}
          className="flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full bg-amber-200 text-[#16352b] shadow-[0_0_0_1px_rgb(251_191_36/0.45)] hover:bg-amber-100 md:size-9"
          onConfirm={async () => {
            if (picked === null) return
            setPending(true)
            try {
              await onBid(picked)
            } catch (error) {
              setPending(false)
              throw error
            }
          }}
        >
          <Check className="size-3.5 md:size-4" strokeWidth={2.75} />
        </PopConfirmButton>
      </div>
    </div>
  )
}
