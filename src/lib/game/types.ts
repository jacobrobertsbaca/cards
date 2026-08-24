export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const
export type Suit = (typeof SUITS)[number]

export const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const
export type Rank = (typeof RANKS)[number]

export type Card = {
  suit: Suit
  rank: Rank
}

export type LeadTrump = "always" | "after-broken"

export type ScoringFormula = {
  made: string
  miss: string
}

export type GameSettings = {
  kind: "oh-hell"
  seatCount: number
  pattern: number[]
  leadTrump: LeadTrump
  hook: boolean
  scoring: ScoringFormula
}

export type Seat = {
  index: number
  playerId: string | null
  displayName: string | null
}

export type Phase =
  | "lobby"
  | "bidding"
  | "playing"
  | "trick-end"
  | "round-end"
  | "game-over"

export type TrickPlay = {
  seat: number
  card: Card
}

export type RoundRecord = {
  cards: number
  trump: Card | null
  bids: number[]
  tricks: number[]
  scores: number[]
}

export type GameState = {
  title: string
  settings: GameSettings
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
}

export const DEFAULT_FORMULA: ScoringFormula = {
  made: "10 + t",
  miss: "t",
}

export const MIN_SEATS = 2
export const MAX_SEATS = 5
