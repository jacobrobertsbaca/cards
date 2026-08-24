"use client"

import { PlayingCard } from "./playing-card"

export function DealOverlay({ shuffling }: { shuffling: boolean }) {
  if (!shuffling) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
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
    </div>
  )
}
