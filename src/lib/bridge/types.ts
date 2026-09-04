import type { Suit } from "@/lib/game/types"
import type { Seat, Phase, Card, TrickPlay } from "@/lib/game/types"

export type BridgeStrain = Suit | "notrump"
export type BridgeSide = "NS" | "EW"

export type BridgeCall =
  | { type: "pass" }
  | { type: "double" }
  | { type: "redouble" }
  | { type: "bid"; level: number; strain: BridgeStrain }

export type BridgeContract = {
  level: number
  strain: BridgeStrain
  doubles: 0 | 1 | 2
  declarer: number
  dummy: number
}

export type BridgeSettings = {
  kind: "bridge"
  /** Fixed at 4 for rubber bridge. */
  seatCount: 4
}

export type BridgeDealRecord = {
  declarer: number
  side: BridgeSide
  level: number
  strain: BridgeStrain
  doubles: 0 | 1 | 2
  tricks: number
  /** Net points for the declaring side (positive = made money). */
  net: number
  isLast?: boolean
}

export type BridgeState = {
  title: string
  settings: BridgeSettings
  seats: Seat[]
  dealer: number
  dealIndex: number
  phase: Phase
  currentSeat: number | null
  hands: Card[][]
  auction: BridgeCall[]
  contract: BridgeContract | null
  /** Derived trump suit for play; null for notrump. */
  trumpSuit: Suit | null
  openingLeadDone: boolean
  tricks: number[]
  currentTrick: TrickPlay[]
  lastTrick: TrickPlay[]
  trickLeader: number
  history: BridgeDealRecord[]
  rematchCode: string | null
}

export const BRIDGE_SEAT_COUNT = 4 as const

export const STRAIN_ORDER: BridgeStrain[] = [
  "clubs",
  "diamonds",
  "hearts",
  "spades",
  "notrump",
]

export const DEFAULT_BRIDGE_SETTINGS: BridgeSettings = {
  kind: "bridge",
  seatCount: 4,
}

export function sideForSeat(seat: number): BridgeSide {
  return seat % 2 === 0 ? "NS" : "EW"
}

export function partnerSeat(seat: number): number {
  return (seat + 2) % BRIDGE_SEAT_COUNT
}

export function strainRank(strain: BridgeStrain): number {
  return STRAIN_ORDER.indexOf(strain)
}

export function compareBids(
  a: { level: number; strain: BridgeStrain },
  b: { level: number; strain: BridgeStrain }
): number {
  if (a.level !== b.level) return a.level - b.level
  return strainRank(a.strain) - strainRank(b.strain)
}
