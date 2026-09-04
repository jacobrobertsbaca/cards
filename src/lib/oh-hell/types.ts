import type { Card, Phase, Seat, TrickPlay } from "@/lib/game/types"

export type LeadTrump = "always" | "after-broken"

export type ScoringFormula = {
  made: string
  miss: string
}

export type OhHellSettings = {
  kind: "oh-hell"
  seatCount: number
  pattern: number[]
  leadTrump: LeadTrump
  hook: boolean
  scoring: ScoringFormula
}

export type RoundRecord = {
  cards: number
  trump: Card | null
  bids: number[]
  tricks: number[]
  scores: number[]
}

export type OhHellState = {
  title: string
  settings: OhHellSettings
  seats: Seat[]
  dealer: number
  roundIndex: number
  trump: Card | null
  trumpBroken: boolean
  phase: Phase
  currentSeat: number | null
  hands: Card[][]
  bids: Array<number | null>
  tricks: number[]
  currentTrick: TrickPlay[]
  lastTrick: TrickPlay[]
  trickLeader: number
  scores: number[]
  history: RoundRecord[]
  rematchCode: string | null
}

export const DEFAULT_FORMULA: ScoringFormula = {
  made: "10+t",
  miss: "t",
}

export const MIN_SEATS = 2
export const MAX_SEATS = 5
