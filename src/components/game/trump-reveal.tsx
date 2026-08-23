"use client"

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import type { TrumpPhase } from "@/hooks/use-table-motion"
import { TRUMP_FLIP_MS } from "@/hooks/use-table-motion"
import type { Card } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { useCoarsePointer } from "@/hooks/use-coarse-pointer"
import { PlayingCard } from "./playing-card"

export function TrumpSpot({
  card,
  phase,
  clearing,
}: {
  card: Card
  phase: Exclude<TrumpPhase, "hidden">
  clearing?: boolean
}) {
  const moveRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const [faceUp, setFaceUp] = useState(phase !== "down")
  const compact = useCoarsePointer()
  const poised = offset !== null
  const atCenter = phase === "down" || phase === "flip"

  useLayoutEffect(() => {
    if (phase !== "down" || offset) return
    const el = moveRef.current
    const felt = el?.closest(".felt")
    if (!el || !felt) return
    const home = el.getBoundingClientRect()
    const area = felt.getBoundingClientRect()
    setOffset({
      x: area.left + area.width / 2 - (home.left + home.width / 2),
      y: area.top + area.height / 2 - (home.top + home.height / 2),
    })
  }, [offset, phase])

  useEffect(() => {
    if (phase === "down") {
      setFaceUp(false)
      return
    }
    if (phase !== "flip") {
      setFaceUp(true)
      return
    }
    const timer = window.setTimeout(() => setFaceUp(true), TRUMP_FLIP_MS / 2)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] flex flex-col items-center",
        phase === "rest" ? "z-20" : "z-40",
        clearing && "table-clear"
      )}
    >
      <div
        ref={moveRef}
        className={cn(
          "trump-move",
          phase === "down" && poised && "trump-enter",
          atCenter && poised && "trump-at-center",
          phase === "fly" && "trump-fly"
        )}
        style={
          offset
            ? ({
                "--dx": `${offset.x}px`,
                "--dy": `${offset.y}px`,
              } as CSSProperties)
            : { opacity: phase === "down" ? 0 : 1 }
        }
      >
        <div className={cn("trump-spin", phase === "flip" && "trump-spin-run")}>
          <div
            className={cn(
              "rounded-lg shadow-[0_0_14px_rgb(251_191_36/0.14)] ring-amber-200/70 ring-offset-[#16352b]",
              compact ? "ring-1 ring-offset-1" : "ring-2 ring-offset-2"
            )}
          >
            <PlayingCard
              card={faceUp ? card : undefined}
              faceDown={!faceUp}
              size={compact ? "xs" : "md"}
              className="transition-none shadow-lg"
            />
          </div>
        </div>
      </div>
      <p
        className={cn(
          "mt-1.5 text-[10px] font-medium tracking-[0.22em] text-amber-100/80 uppercase transition-opacity duration-200",
          phase === "rest" ? "opacity-100" : "opacity-0"
        )}
      >
        Trump
      </p>
    </div>
  )
}
