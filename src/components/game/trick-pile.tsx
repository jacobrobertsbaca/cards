"use client"

import { useRef, type CSSProperties } from "react"
import { dealOffset, exitOffset } from "@/hooks/use-table-motion"
import type { TrickPlay } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { slotFor, type TableSlot } from "./player-seat"
import { usePlayOrigin, type PlayOrigin } from "./play-origin"
import { PlayingCard } from "./playing-card"

const STACK_BY_SLOT: Record<TableSlot, { ox: string; oy: string; tilt: string }> = {
  south: { ox: "10px", oy: "32px", tilt: "6deg" },
  north: { ox: "-10px", oy: "-32px", tilt: "-6deg" },
  west: { ox: "-36px", oy: "8px", tilt: "-12deg" },
  east: { ox: "36px", oy: "-8px", tilt: "12deg" },
  "north-left": { ox: "-24px", oy: "-28px", tilt: "-8deg" },
  "north-right": { ox: "24px", oy: "-28px", tilt: "8deg" },
}

function playKey(play: TrickPlay) {
  return `${play.seat}-${play.card.rank}${play.card.suit}`
}

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
  const origins = usePlayOrigin()
  const captured = useRef(new Map<string, PlayOrigin>())
  const last = plays[plays.length - 1]
  if (last && !leaving) {
    const key = playKey(last)
    if (!captured.current.has(key)) {
      const origin = origins?.take(last.seat)
      if (origin) captured.current.set(key, origin)
    }
  }
  if (plays.length === 0) {
    captured.current.clear()
    return null
  }
  const winnerSlot =
    winnerSeat !== null
      ? slotFor(seatCount, (winnerSeat - mySeat + seatCount) % seatCount)
      : null
  const exit = winnerSlot ? exitOffset(winnerSlot) : { x: "0vw", y: "20vh" }

  return (
    <div className="absolute top-1/2 left-1/2 z-20 flex h-40 w-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center md:h-44 md:w-40">
      {plays.map((play, index) => {
        const fromSlot = slotFor(
          seatCount,
          (play.seat - mySeat + seatCount) % seatCount
        )
        const stack = STACK_BY_SLOT[fromSlot]
        const from = dealOffset(fromSlot)
        const origin = captured.current.get(playKey(play))
        const won = Boolean(highlightWinner) && winnerSeat === play.seat && !leaving
        return (
          <div
            key={playKey(play)}
            className={cn(
              "absolute trick-rest origin-center scale-[0.82] md:scale-100",
              leaving
                ? "trick-out"
                : index === plays.length - 1 && "play-fly"
            )}
            style={
              {
                "--from-x": origin ? `${origin.x}px` : from.x,
                "--from-y": origin ? `${origin.y}px` : from.y,
                "--from-scale": origin?.scale ?? 0.85,
                "--from-tilt": origin?.tilt ?? stack.tilt,
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
