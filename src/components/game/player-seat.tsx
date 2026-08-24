"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, Crown } from "lucide-react"
import { isLegalPlay } from "@/lib/game/engine"
import type { Card, GameState, Seat } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { useCoarsePointer } from "@/hooks/use-coarse-pointer"
import { useArrivingIndex } from "@/hooks/use-deal-in"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FAN_CARD, fanPose } from "./fan"
import { PopConfirmButton } from "./pop-confirm"
import { originFromElement, usePlayOrigin } from "./play-origin"
import { CardFan, DealIn, PlayingCard } from "./playing-card"

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
  south:
    "bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 items-center",
  west: "left-[max(0.75rem,env(safe-area-inset-left))] top-1/2 -translate-y-1/2 items-center",
  east: "right-[max(0.75rem,env(safe-area-inset-right))] top-1/2 -translate-y-1/2 items-center",
  north:
    "top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 items-center",
  "north-left": "top-[max(1.5rem,env(safe-area-inset-top))] left-[22%] items-center",
  "north-right": "top-[max(1.5rem,env(safe-area-inset-top))] right-[22%] items-center",
}

export function PlayerSeat({
  seat,
  state,
  slot,
  self,
  spectating,
  online,
  revealCount,
  dealing,
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
  dealing?: boolean
  clearing?: boolean
  wonTrick?: boolean
  onPlay?: (card: Card) => void | Promise<void | boolean>
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
        sideways
          ? "flex-row items-center gap-2"
          : "max-w-[min(calc(100vw-7.5rem),48rem)] flex-col",
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
            dealing={dealing}
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
            dealing={dealing}
          />
        </SideHand>
      )}

      <div
        className={cn(
          "flex items-center gap-2 text-white/90",
          slot === "south" ? "mt-1 mb-7 md:mb-6" : "my-1",
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
            dealing={dealing}
          />
        </SideHand>
      )}

      {slot === "south" && (
        showFaces ? (
          <OwnHand
            hand={hand}
            state={state}
            seat={seat.index}
            dealing={dealing}
            onPlay={onPlay}
          />
        ) : (
          <div className="flex items-end justify-center pt-1">
            <CardFan count={hand.length} faceDown size="lg" dealing={dealing} />
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
  dealing,
  onPlay,
}: {
  hand: Card[]
  state: GameState
  seat: number
  dealing?: boolean
  onPlay?: (card: Card) => void | Promise<void | boolean>
}) {
  const confirmToPlay = useCoarsePointer()
  const playOrigin = usePlayOrigin()
  const cardNodes = useRef(new Map<string, HTMLElement>())
  const [hover, setHover] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const arriving = useArrivingIndex(hand.length, dealing)
  const spec = confirmToPlay
    ? { ...FAN_CARD.lg, radius: 300, maxHalfAngle: 12 }
    : { ...FAN_CARD.xl, maxHalfAngle: 18 }
  const gap = confirmToPlay ? 2.6 : 1.6
  const cardSize = confirmToPlay ? "lg" : "xl"
  const sample = fanPose(hand.length, 0, spec.radius, spec.maxHalfAngle, gap)
  const width = Math.max(spec.w, 2 * Math.abs(sample.x) + spec.w)
  const height = spec.h + sample.depth
  const ourTurn =
    Boolean(onPlay) && state.phase === "playing" && state.currentSeat === seat

  useEffect(() => {
    setPicked(null)
  }, [hand.length, ourTurn, confirmToPlay])

  function rememberOrigin(card: Card) {
    const node = cardNodes.current.get(`${card.rank}${card.suit}`)
    const felt = node?.closest(".felt")
    if (!node || !felt || !playOrigin) return
    playOrigin.set(seat, originFromElement(node, felt))
  }

  async function playNow(card: Card) {
    if (!onPlay || pendingRef.current) return
    if (!isLegalPlay(state, seat, card)) return
    pendingRef.current = true
    rememberOrigin(card)
    setPending(true)
    try {
      await onPlay(card)
      setPicked(null)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const selectedCard = picked !== null ? hand[picked] ?? null : null
  const canPlaySelected =
    selectedCard !== null &&
    ourTurn &&
    !pending &&
    isLegalPlay(state, seat, selectedCard)

  return (
    <div>
      <div
        className={cn(
          "pointer-events-auto relative transition-opacity duration-200",
          !ourTurn && "opacity-70"
        )}
        style={{ width, height }}
        onMouseLeave={() => setHover(null)}
      >
        {hand.map((card, index) => {
          const canPlay = ourTurn && isLegalPlay(state, seat, card)
          const pose = fanPose(hand.length, index, spec.radius, spec.maxHalfAngle, gap)
          const spreadFrom = confirmToPlay ? picked : hover
          const spread =
            spreadFrom === null || index === spreadFrom
              ? 0
              : Math.sign(index - spreadFrom) * neighborPush(Math.abs(index - spreadFrom))
          const lift = !confirmToPlay && hover === index ? -6 : 0
          return (
            <div
              key={`${card.rank}${card.suit}`}
              ref={(node) => {
                const key = `${card.rank}${card.suit}`
                if (node) cardNodes.current.set(key, node)
                else cardNodes.current.delete(key)
              }}
              className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              onMouseEnter={() => setHover(index)}
              style={{
                transform: `translateX(calc(-50% + ${pose.x + spread}px)) translateY(${pose.y - pose.depth + lift}px) rotate(${pose.rotate}deg)`,
                zIndex: index,
                isolation: "isolate",
              }}
            >
              <DealIn active={index === arriving}>
                <PlayingCard
                  card={card}
                  size={cardSize}
                  selected={picked === index}
                  disabled={ourTurn && !canPlay}
                  onClick={
                    canPlay
                      ? () => {
                          if (confirmToPlay) {
                            setPicked((current) => (current === index ? null : index))
                            return
                          }
                          void playNow(card)
                        }
                      : undefined
                  }
                  className="touch-manipulation hover:translate-y-0"
                />
              </DealIn>
            </div>
          )
        })}
      </div>
      <div className="pointer-events-none fixed bottom-[calc(12rem+env(safe-area-inset-bottom,0px))] left-1/2 z-40 -translate-x-1/2">
        <PopConfirmButton
          show={confirmToPlay && canPlaySelected}
          label="Play selected card"
          className="pointer-events-auto flex size-9 touch-manipulation items-center justify-center rounded-full bg-amber-200 text-[#16352b] shadow-[0_0_0_1px_rgb(251_191_36/0.45)] hover:bg-amber-100"
          onConfirm={() => {
            if (selectedCard) void playNow(selectedCard)
          }}
        >
          <Check className="size-4" strokeWidth={2.75} />
        </PopConfirmButton>
      </div>
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
    <div className="flex h-48 w-22 shrink-0 items-center justify-center overflow-visible">
      <div className={cn("overflow-visible", slot === "west" ? "-rotate-90" : "rotate-90")}>
        {children}
      </div>
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
  if (bid === null) return "No bid yet"
  const bidWord = bid === 1 ? "trick" : "tricks"
  return `Made ${tricks}, bid ${bid} ${bidWord}`
}
