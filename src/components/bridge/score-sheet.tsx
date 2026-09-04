"use client"

import { Fragment } from "react"
import { ClipboardList } from "lucide-react"
import {
  dealNetPoints,
  isSideVulnerable,
  playFromHistory,
  rubberWinners,
  sidePoints,
  type Bonus,
  type RubberPlay,
} from "@/lib/bridge/scoring"
import type {
  BridgeDealRecord,
  BridgeSide,
  BridgeState,
} from "@/lib/bridge/types"
import { sideForSeat } from "@/lib/bridge/types"
import { SUIT_GLYPH } from "@/lib/game/cards"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function strainGlyph(strain: BridgeDealRecord["strain"]) {
  if (strain === "notrump") return "NT"
  return SUIT_GLYPH[strain]
}

function sideLabel(side: BridgeSide, we: BridgeSide) {
  return side === we ? "We" : "They"
}

function dealDescription(deal: BridgeDealRecord, we: BridgeSide) {
  const book = 6
  const made = deal.tricks - book
  const result =
    deal.tricks >= deal.level + book
      ? `made ${made}`
      : `down ${deal.level + book - deal.tricks}`
  return (
    <>
      {sideLabel(deal.side, we)} bid {deal.level}
      <span
        className={
          deal.strain === "hearts" || deal.strain === "diamonds"
            ? "text-[#c43b3b]"
            : undefined
        }
      >
        {strainGlyph(deal.strain)}
      </span>
      {"X".repeat(deal.doubles)}, {result}
    </>
  )
}

function ScoreCell({
  bonus,
  crown,
}: {
  bonus?: Bonus
  crown?: boolean
}) {
  return (
    <td className="px-2 py-0.5 text-center tabular-nums">
      {bonus ? (
        <Tooltip>
          <TooltipTrigger delay={150} className="tabular-nums">
            {crown ? "👑 " : ""}
            {bonus.points}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs flex-col items-start gap-0.5">
            <p className="font-medium">
              {bonus.title} +{bonus.points}
            </p>
            <p className="text-xs opacity-80">{bonus.desc}</p>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </td>
  )
}

function RubberCard({ play, we }: { play: RubberPlay; we: BridgeSide }) {
  const they: BridgeSide = we === "NS" ? "EW" : "NS"
  const columns = [we, they] as const
  const winners = rubberWinners(play)
  const above = {
    NS: play.games.flatMap((g) => g.sides.NS.above),
    EW: play.games.flatMap((g) => g.sides.EW.above),
  }
  const aboveRows = Math.max(above.NS.length, above.EW.length)

  return (
    <div className="relative">
      {/* Continuous center rule — avoids border-collapse hang-nails */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#2c261e]/25"
      />
      <table className="w-full border-collapse font-sans text-sm">
        <thead>
          <tr>
            {columns.map((side) => (
              <th
                key={side}
                className="border-b border-[#2c261e]/35 px-2 py-1.5 text-center font-medium"
              >
                {play.completed && winners.includes(side) ? "👑 " : ""}
                {!play.completed && isSideVulnerable(play, side)
                  ? "🏴‍☠️ "
                  : ""}
                {sideLabel(side, we)}{" "}
                <span className="font-normal text-[#6f675e]">
                  {sidePoints(play, side)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {aboveRows > 0 &&
            Array.from({ length: aboveRows }, (_, i) => aboveRows - 1 - i).map(
              (idx) => (
                <tr key={`a-${idx}`}>
                  {columns.map((side) => (
                    <ScoreCell key={side} bonus={above[side][idx]} />
                  ))}
                </tr>
              )
            )}
          <tr aria-hidden>
            <td colSpan={2} className="h-0.5 bg-[#2c261e]/55 p-0" />
          </tr>
          {play.games.map((game, gi) => {
            const below = {
              NS: game.sides.NS.below,
              EW: game.sides.EW.below,
            }
            const rows = Math.max(below.NS.length, below.EW.length, 1)
            return (
              <Fragment key={`game-${gi}`}>
                {Array.from({ length: rows }, (_, idx) => (
                  <tr key={`g-${gi}-${idx}`}>
                    {columns.map((side) => (
                      <ScoreCell
                        key={side}
                        bonus={below[side][idx]}
                        crown={
                          game.completed &&
                          game.winner === side &&
                          idx === below[side].length - 1
                        }
                      />
                    ))}
                  </tr>
                ))}
                {game.completed && gi < play.games.length - 1 && (
                  <tr aria-hidden>
                    <td
                      colSpan={2}
                      className="h-px border-t border-dashed border-[#6f675e]/55 p-0"
                    />
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DealList({
  history,
  play,
  we,
}: {
  history: BridgeDealRecord[]
  play: RubberPlay
  we: BridgeSide
}) {
  if (history.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-[#6f675e]">No deals yet</p>
    )
  }
  const winners = rubberWinners(play)
  return (
    <ul className="space-y-2 text-sm">
      {history.map((deal, index) => {
        const net = deal.net || dealNetPoints(play, index, deal.side)
        const isLast = index === history.length - 1
        return (
          <li key={index} className="leading-snug">
            <span className="text-[#6f675e]">#{index + 1} </span>
            <span>
              {dealDescription(deal, we)}{" "}
              <span
                className={cn(
                  "tabular-nums",
                  net >= 0 ? "text-emerald-700" : "text-amber-700"
                )}
              >
                {net >= 0 ? "+" : ""}
                {net}
              </span>
            </span>
            {play.completed && isLast && winners.length === 1 && (
              <div className="text-xs text-[#6f675e]">
                {sideLabel(winners[0], we)} win with{" "}
                {sidePoints(play, winners[0])} points
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function BridgeScoreboard({
  state,
  mySeat = null,
  className,
}: {
  state: BridgeState
  mySeat?: number | null
  className?: string
}) {
  const play = playFromHistory(state.history)
  const we = mySeat !== null ? sideForSeat(mySeat) : "NS"
  const they: BridgeSide = we === "NS" ? "EW" : "NS"

  return (
    <Dialog>
      <DialogTrigger
        aria-label="Score sheet"
        className={cn(
          "pointer-events-auto absolute right-[max(0.5rem,env(safe-area-inset-right))] bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 cursor-pointer text-white outline-none md:right-4 md:bottom-4 md:rounded-md md:px-2.5 md:py-1.5 md:hover:bg-white/10",
          className
        )}
      >
        <span className="hidden text-right text-xs md:block">
          <div className="flex justify-end gap-3">
            <span>We</span>
            <span className="w-8 tabular-nums">{sidePoints(play, we)}</span>
          </div>
          <div className="flex justify-end gap-3">
            <span>They</span>
            <span className="w-8 tabular-nums">{sidePoints(play, they)}</span>
          </div>
        </span>
        <span className="flex size-8 items-center justify-center rounded-md hover:bg-white/10 md:hidden">
          <ClipboardList className="size-4" />
        </span>
      </DialogTrigger>
      <DialogContent className="bg-[#f7f4ee] text-[#2c261e] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans">Scoresheet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <DealList history={state.history} play={play} we={we} />
          <div className="overflow-hidden rounded-sm border border-[#2c261e]/25 bg-[#fbfaf6]">
            <RubberCard play={play} we={we} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
