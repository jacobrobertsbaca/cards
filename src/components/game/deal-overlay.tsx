"use client"

import type { CSSProperties } from "react"
import type { DealFlight } from "@/hooks/use-table-motion"
import { dealOffset } from "@/hooks/use-table-motion"
import type { Card } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { PlayingCard } from "./playing-card"

export function DealOverlay({
  shuffling,
  flights,
  trump,
}: {
  shuffling: boolean
  flights: DealFlight[]
  trump: Card | null
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {shuffling && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="deck-shuffle relative">
            <PlayingCard faceDown size="md" className="-rotate-6" />
            <PlayingCard
              faceDown
              size="md"
              className="absolute top-0 left-1 rotate-3"
            />
            <PlayingCard
              faceDown
              size="md"
              className="absolute top-0 left-0 -rotate-2"
            />
          </div>
        </div>
      )}
      {flights.map((flight) => {
        const offset = dealOffset(flight.slot)
        return (
          <div
            key={flight.id}
            className={cn(
              "deal-fly absolute top-1/2 left-1/2",
              flight.slot === "trump" && "deal-fly-trump"
            )}
            style={{
              "--dx": offset.x,
              "--dy": offset.y,
            } as CSSProperties}
          >
            <PlayingCard
              card={flight.slot === "trump" ? trump ?? undefined : undefined}
              faceDown={flight.slot !== "trump"}
              size={flight.slot === "trump" ? "md" : "sm"}
              className="transition-none"
            />
          </div>
        )
      })}
    </div>
  )
}
