"use client"

import type { CSSProperties } from "react"
import { dealOffset, exitOffset } from "@/hooks/use-table-motion"
import type { TrickPlay } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { slotFor } from "./player-seat"
import { PlayingCard } from "./playing-card"

const STACK = [
  { ox: "-16px", oy: "10px", tilt: "-9deg" },
  { ox: "12px", oy: "-6px", tilt: "7deg" },
  { ox: "-6px", oy: "-12px", tilt: "-3deg" },
  { ox: "14px", oy: "6px", tilt: "5deg" },
  { ox: "2px", oy: "-4px", tilt: "-6deg" },
]

export function TrickPile({
  plays,
  leaving,
  winnerSeat,
  mySeat,
  seatCount,
  highlightWinner,
  takenByUs,
}: {
  plays: TrickPlay[]
  leaving: boolean
  winnerSeat: number | null
  mySeat: number
  seatCount: number
  highlightWinner?: boolean
  takenByUs?: boolean
}) {
  if (plays.length === 0) return null
  const winnerSlot =
    winnerSeat !== null
      ? slotFor(seatCount, (winnerSeat - mySeat + seatCount) % seatCount)
      : null
  const exit = winnerSlot ? exitOffset(winnerSlot) : { x: "0vw", y: "20vh" }

  return (
    <div className="absolute top-1/2 left-1/2 z-20 flex h-36 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
      {plays.map((play, index) => {
        const stack = STACK[index] ?? STACK[0]
        const fromSlot = slotFor(
          seatCount,
          (play.seat - mySeat + seatCount) % seatCount
        )
        const from = dealOffset(fromSlot)
        const won = Boolean(highlightWinner) && winnerSeat === play.seat && !leaving
        return (
          <div
            key={`${play.card.rank}${play.card.suit}${play.seat}`}
            className={cn(
              "absolute trick-rest",
              leaving
                ? "trick-out"
                : index === plays.length - 1 && "play-fly"
            )}
            style={
              {
                "--from-x": from.x,
                "--from-y": from.y,
                "--ox": stack.ox,
                "--oy": stack.oy,
                "--tilt": stack.tilt,
                "--exit-x": exit.x,
                "--exit-y": exit.y,
                zIndex: index + 1,
              } as CSSProperties
            }
          >
            <PlayingCard
              card={play.card}
              size="lg"
              className={cn(
                "transition-none",
                won && (takenByUs ? "trick-win-green" : "trick-win-red")
              )}
            />
          </div>
        )
      })}
    </div>
  )
}
