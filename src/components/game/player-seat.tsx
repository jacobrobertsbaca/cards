"use client"

import { useState, type ReactNode } from "react"
import { Crown } from "lucide-react"
import { isLegalPlay } from "@/lib/game/engine"
import type { Card, GameState, Seat } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FAN_CARD, fanPose } from "./fan"
import { CardFan, PlayingCard } from "./playing-card"

export type TableSlot =
  | "south"
  | "west"
  | "east"
  | "north"
  | "north-left"
  | "north-right"

export function slotFor(count: number, relative: number): TableSlot {
  if (count === 2) return (["south", "north"] as const)[relative]
  if (count === 3) return (["south", "west", "east"] as const)[relative]
  if (count === 4) return (["south", "west", "north", "east"] as const)[relative]
  return (["south", "west", "north-left", "north-right", "east"] as const)[relative]
}

const SLOT_CLASS: Record<TableSlot, string> = {
  south: "bottom-3 left-1/2 -translate-x-1/2 items-center",
  west: "left-3 top-1/2 -translate-y-1/2 items-center",
  east: "right-3 top-1/2 -translate-y-1/2 items-center",
  north: "top-3 left-1/2 -translate-x-1/2 items-center",
  "north-left": "top-6 left-[22%] items-center",
  "north-right": "top-6 right-[22%] items-center",
}

export function PlayerSeat({
  seat,
  state,
  slot,
  self,
  spectating,
  online,
  revealCount,
  clearing,
  wonTrick,
  onPlay,
}: {
  seat: Seat
  state: GameState
  slot: TableSlot
  self: boolean
  spectating: boolean
  online: boolean
  revealCount?: number
  clearing?: boolean
  wonTrick?: boolean
  onPlay?: (card: Card) => void
}) {
  const full = state.hands[seat.index] ?? []
  const hand = revealCount === undefined ? full : full.slice(0, revealCount)
  const bid = state.bids[seat.index]
  const tricks = state.tricks[seat.index]
  const showFaces = self || spectating
  const isTurn =
    (state.phase === "playing" || state.phase === "bidding") &&
    state.currentSeat === seat.index
  const dealer = state.dealer === seat.index
  const sideways = slot === "west" || slot === "east"

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 flex",
        sideways ? "flex-row items-center gap-2" : "max-w-[min(96vw,48rem)] flex-col",
        SLOT_CLASS[slot],
        clearing && "table-clear"
      )}
    >
      {slot.startsWith("north") && (
        <div className="mb-3">
          <CardFan
            count={hand.length}
            cards={showFaces ? hand : undefined}
            faceDown={!showFaces}
            size="sm"
          />
        </div>
      )}
      {slot === "east" && (
        <SideHand slot="east">
          <CardFan
            count={hand.length}
            cards={showFaces ? hand : undefined}
            faceDown={!showFaces}
            size="sm"
          />
        </SideHand>
      )}

      <div
        className={cn(
          "flex items-center gap-2 text-white/90",
          slot === "south" ? "mt-1 mb-5" : "my-1",
          slot === "west" && "[writing-mode:vertical-rl] rotate-180",
          slot === "east" && "[writing-mode:vertical-rl]"
        )}
      >
        {dealer && (
          <DealerButton name={seat.displayName ?? "This seat"} />
        )}
        <span
          className={cn(
            "text-sm font-medium",
            isTurn ? "name-turn" : seat.displayName ? "text-white/80" : "text-white/50"
          )}
        >
          {seat.displayName ?? <WaitingName />}
        </span>
        {wonTrick && (
          <Crown
            aria-label="Won the trick"
            className="size-3.5 shrink-0 fill-amber-200 text-amber-200"
          />
        )}
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            seat.playerId
              ? online
                ? "bg-emerald-300"
                : "bg-white/30"
              : "bg-white/15"
          )}
        />
        {state.phase !== "lobby" && (
          <Tooltip>
            <TooltipTrigger
              delay={200}
              className="pointer-events-auto font-mono text-xs text-white/70"
            >
              {bid === null ? "–" : `${tricks}/${bid}`}
            </TooltipTrigger>
            <TooltipContent>{bidMadeLabel(bid, tricks)}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {slot === "west" && (
        <SideHand slot="west">
          <CardFan
            count={hand.length}
            cards={showFaces ? hand : undefined}
            faceDown={!showFaces}
            size="sm"
          />
        </SideHand>
      )}

      {slot === "south" && (
        showFaces ? (
          <OwnHand
            hand={hand}
            state={state}
            seat={seat.index}
            onPlay={onPlay}
          />
        ) : (
          <div className="flex items-end justify-center pt-1">
            <CardFan count={hand.length} faceDown size="lg" />
          </div>
        )
      )}
    </div>
  )
}

function OwnHand({
  hand,
  state,
  seat,
  onPlay,
}: {
  hand: Card[]
  state: GameState
  seat: number
  onPlay?: (card: Card) => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  const spec = FAN_CARD.xl
  const sample = fanPose(hand.length, 0, spec.radius, spec.maxHalfAngle)
  const width = Math.max(spec.w, 2 * Math.abs(sample.x) + spec.w)
  const height = spec.h + sample.depth
  const ourTurn = state.phase === "playing" && state.currentSeat === seat

  return (
    <div
      className={cn(
        "pointer-events-auto relative transition-opacity duration-200",
        !ourTurn && "opacity-70"
      )}
      style={{ width, height }}
      onMouseLeave={() => setHover(null)}
    >
      {hand.map((card, index) => {
        const canPlay =
          Boolean(onPlay) &&
          state.phase === "playing" &&
          state.currentSeat === seat &&
          isLegalPlay(state, seat, card)
        const pose = fanPose(hand.length, index, spec.radius, spec.maxHalfAngle)
        const spread =
          hover === null || index === hover
            ? 0
            : Math.sign(index - hover) * neighborPush(Math.abs(index - hover))
        const lift = hover === index ? -6 : 0
        return (
          <div
            key={`${card.rank}${card.suit}${index}`}
            className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-150 ease-out"
            onMouseEnter={() => setHover(index)}
            style={{
              transform: `translateX(calc(-50% + ${pose.x + spread}px)) translateY(${pose.y - pose.depth + lift}px) rotate(${pose.rotate}deg)`,
              zIndex: index,
              isolation: "isolate",
            }}
          >
            <PlayingCard
              card={card}
              size="xl"
              disabled={
                state.phase === "playing" &&
                state.currentSeat === seat &&
                !canPlay
              }
              onClick={canPlay ? () => onPlay?.(card) : undefined}
              className="hover:translate-y-0"
            />
          </div>
        )
      })}
    </div>
  )
}

function neighborPush(distance: number) {
  if (distance === 1) return 10
  if (distance === 2) return 6
  return 3
}

function SideHand({
  slot,
  children,
}: {
  slot: "west" | "east"
  children: ReactNode
}) {
  return (
    <div className="flex h-48 w-22 shrink-0 items-center justify-center">
      <div className={slot === "west" ? "-rotate-90" : "rotate-90"}>{children}</div>
    </div>
  )
}

function WaitingName() {
  return (
    <>
      Waiting for player
      <span className="waiting-ellipsis" aria-hidden="true" />
    </>
  )
}

function DealerButton({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        aria-label={`${name} is the dealer`}
        className="pointer-events-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-[#16352b] shadow-[0_0_0_1px_rgb(251_191_36/0.45)]"
      >
        D
      </TooltipTrigger>
      <TooltipContent>{name} is the dealer</TooltipContent>
    </Tooltip>
  )
}

function bidMadeLabel(bid: number | null, tricks: number) {
  const made = tricks === 1 ? "1 trick" : `${tricks} tricks`
  if (bid === null) return "No bid yet"
  return `Bid ${bid}, made ${made}`
}
