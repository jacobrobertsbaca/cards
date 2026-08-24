"use client"

import { type ReactNode } from "react"
import { SUIT_GLYPH } from "@/lib/game/cards"
import { useArrivingIndex, useDealIn } from "@/hooks/use-deal-in"
import type { Card } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { FAN_CARD, fanPose } from "./fan"

const SIZES = {
  xs: "w-10 h-[3.7rem] text-[10px] rounded-md",
  sm: "w-9 h-[3.15rem] text-[10px] rounded-md",
  md: "w-14 h-[5.15rem] text-xs rounded-lg",
  lg: "w-[5.35rem] h-[7.5rem] text-sm rounded-xl",
  xl: "w-[6rem] h-[8.4rem] text-base rounded-xl",
}

export function PlayingCard({
  card,
  faceDown = false,
  size = "md",
  selected = false,
  disabled = false,
  onClick,
  className,
}: {
  card?: Card
  faceDown?: boolean
  size?: keyof typeof SIZES
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
}) {
  const red = card?.suit === "hearts" || card?.suit === "diamonds"
  const Tag = onClick ? "button" : "div"

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      className={cn(
        "relative isolate shrink-0 border shadow-md transition-transform duration-200 outline-none disabled:opacity-100",
        SIZES[size],
        faceDown
          ? "border-[#1b2a4a] bg-[#243868] card-back"
          : "border-black/5 bg-[#fbfaf6]",
        onClick && !disabled && "[@media(hover:hover)]:hover:-translate-y-2 [@media(hover:hover)]:hover:shadow-lg",
        selected && "border-transparent ring-[3px] ring-amber-300",
        disabled && "brightness-[0.55] saturate-50",
        className
      )}
    >
      {faceDown || !card ? (
        <div className="absolute inset-[3px] rounded-[inherit] border border-white/15" />
      ) : (
        <div
          className={cn(
            "flex h-full flex-col justify-between p-1.5 leading-none",
            red ? "text-[#c43b3b]" : "text-neutral-900"
          )}
        >
          <div className="flex flex-col items-start">
            <span className="font-semibold">{card.rank}</span>
            <span>{SUIT_GLYPH[card.suit]}</span>
          </div>
          <span
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90",
              size === "xl"
                ? "text-4xl"
                : size === "lg"
                  ? "text-3xl"
                  : size === "md"
                    ? "text-2xl"
                    : "text-sm"
            )}
          >
            {SUIT_GLYPH[card.suit]}
          </span>
          <div className="flex rotate-180 flex-col items-start">
            <span className="font-semibold">{card.rank}</span>
            <span>{SUIT_GLYPH[card.suit]}</span>
          </div>
        </div>
      )}
    </Tag>
  )
}

export function DealIn({ active, children }: { active: boolean; children: ReactNode }) {
  const ref = useDealIn(active)
  return (
    <div
      ref={ref}
      className={cn(
        "inline-block [transform-origin:center]",
        active && "relative z-20"
      )}
    >
      {children}
    </div>
  )
}

export function CardFan({
  count,
  cards,
  faceDown,
  size = "sm",
  rotate = 0,
  dealing = false,
}: {
  count?: number
  cards?: Card[]
  faceDown?: boolean
  size?: keyof typeof SIZES
  rotate?: number
  dealing?: boolean
}) {
  const items = cards ?? Array.from({ length: count ?? 0 })
  const arriving = useArrivingIndex(items.length, dealing)
  const spec = FAN_CARD[size]
  const sample = fanPose(items.length, 0, spec.radius, spec.maxHalfAngle)
  const width = Math.max(spec.w, 2 * Math.abs(sample.x) + spec.w)
  const height = spec.h + sample.depth

  return (
    <div
      className="relative"
      style={{
        width,
        height,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {items.map((card, index) => {
        const pose = fanPose(items.length, index, spec.radius, spec.maxHalfAngle)
        const key = card ? `${card.rank}${card.suit}` : index
        return (
          <div
            key={key}
            className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translateX(calc(-50% + ${pose.x}px)) translateY(${pose.y - pose.depth}px) rotate(${pose.rotate}deg)`,
              zIndex: index,
            }}
          >
            <DealIn active={index === arriving}>
              <PlayingCard card={card} faceDown={faceDown || !card} size={size} />
            </DealIn>
          </div>
        )
      })}
    </div>
  )
}
