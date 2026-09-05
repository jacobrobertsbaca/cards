"use client"

import { motion, useReducedMotion } from "motion/react"
import { CHAT_BUBBLE_DURATION_MS } from "@/lib/chat"
import type { TableSlot } from "./player-seat"
import { cn } from "@/lib/utils"

/** Anchored to the nameplate, same idea as seat emotes. */
const BUBBLE_ANCHOR: Record<TableSlot, string> = {
  south: "-top-5 left-1/2 -translate-x-1/2 -translate-y-full items-center",
  west: "top-1/2 -right-5 translate-x-full -translate-y-1/2 items-start",
  east: "top-1/2 -left-5 -translate-x-full -translate-y-1/2 items-end",
  // North nameplates sit above the hand — keep bubbles on the outer side.
  north: "-top-5 left-1/2 -translate-x-1/2 -translate-y-full items-center",
  "north-left":
    "-top-5 left-1/2 -translate-x-1/2 -translate-y-full items-start",
  "north-right":
    "-top-5 left-1/2 -translate-x-1/2 -translate-y-full items-end",
}

/** Tail points back toward the nameplate. */
const ARROW: Record<
  TableSlot,
  { className: string; path: string; viewBox: string; w: number; h: number }
> = {
  south: {
    className: "left-1/2 top-full -mt-px -translate-x-1/2",
    path: "M0 0 L8 10 L16 0 Z",
    viewBox: "0 0 16 10",
    w: 16,
    h: 10,
  },
  west: {
    className: "top-1/2 right-full -mr-px -translate-y-1/2",
    path: "M10 0 L0 8 L10 16 Z",
    viewBox: "0 0 10 16",
    w: 10,
    h: 16,
  },
  east: {
    className: "top-1/2 left-full -ml-px -translate-y-1/2",
    path: "M0 0 L10 8 L0 16 Z",
    viewBox: "0 0 10 16",
    w: 10,
    h: 16,
  },
  north: {
    className: "left-1/2 top-full -mt-px -translate-x-1/2",
    path: "M0 0 L8 10 L16 0 Z",
    viewBox: "0 0 16 10",
    w: 16,
    h: 10,
  },
  "north-left": {
    className: "left-4 top-full -mt-px",
    path: "M0 0 L8 10 L16 0 Z",
    viewBox: "0 0 16 10",
    w: 16,
    h: 10,
  },
  "north-right": {
    className: "right-4 top-full -mt-px",
    path: "M0 0 L8 10 L16 0 Z",
    viewBox: "0 0 16 10",
    w: 16,
    h: 10,
  },
}

/** Pop in from the nameplate, then drift gently away. */
const FROM_SEAT: Record<TableSlot, { x: number; y: number }> = {
  south: { x: 0, y: 10 },
  west: { x: -12, y: 0 },
  east: { x: 12, y: 0 },
  north: { x: 0, y: 10 },
  "north-left": { x: -4, y: 10 },
  "north-right": { x: 4, y: 10 },
}

const DRIFT: Record<TableSlot, { x: number; y: number }> = {
  south: { x: 0, y: -8 },
  west: { x: 8, y: -3 },
  east: { x: -8, y: -3 },
  north: { x: 0, y: -8 },
  "north-left": { x: 3, y: -8 },
  "north-right": { x: -3, y: -8 },
}

const DURATION_S = CHAT_BUBBLE_DURATION_MS / 1000

export function SeatChatBubble({
  slot,
  body,
  bubbleKey,
}: {
  slot: TableSlot
  body: string
  bubbleKey: string
}) {
  const reduceMotion = useReducedMotion()
  const from = FROM_SEAT[slot]
  const drift = DRIFT[slot]
  const arrow = ARROW[slot]
  const preview = body.length > 120 ? `${body.slice(0, 119)}…` : body

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-40 flex w-max max-w-[min(40rem,90vw)] [writing-mode:horizontal-tb] [&_svg]:rotate-0!",
        BUBBLE_ANCHOR[slot]
      )}
    >
      <motion.div
        key={bubbleKey}
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: 0.92, x: from.x, y: from.y }
        }
        animate={
          reduceMotion
            ? { opacity: [0, 1, 1, 0] }
            : {
                opacity: [0, 1, 1, 0],
                scale: [0.92, 1, 1, 1],
                x: [from.x, 0, drift.x * 0.4, drift.x],
                y: [from.y, 0, drift.y * 0.4, drift.y],
              }
        }
        transition={{
          duration: DURATION_S,
          times: [0, 0.045, 0.82, 1],
          ease: ["easeOut", "linear", "easeIn"],
        }}
        className="relative origin-center will-change-transform"
      >
        <div className="rounded-2xl bg-[#fff8e8] px-3 py-2 text-[#1a2e24] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.35)]">
          <p className="wrap-break-word text-[13px] leading-snug font-medium">
            {preview}
          </p>
        </div>
        <svg
          aria-hidden
          className={cn("absolute overflow-visible", arrow.className)}
          width={arrow.w}
          height={arrow.h}
          viewBox={arrow.viewBox}
        >
          <path d={arrow.path} fill="#fff8e8" />
        </svg>
      </motion.div>
    </div>
  )
}
