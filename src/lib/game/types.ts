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

export type Seat = {
  index: number
  playerId: string | null
  displayName: string | null
  isBot: boolean
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

export type GameKind = "oh-hell" | "bridge"

export type {
  OhHellSettings as OhHellGameSettings,
  OhHellState,
  ScoringFormula,
  LeadTrump,
  RoundRecord,
} from "@/lib/oh-hell/types"

export { DEFAULT_FORMULA, MIN_SEATS, MAX_SEATS } from "@/lib/oh-hell/types"

export type {
  BridgeSettings,
  BridgeState,
  BridgeCall,
  BridgeContract,
  BridgeStrain,
  BridgeDealRecord,
  BridgeSide,
} from "@/lib/bridge/types"

import type { OhHellSettings, OhHellState } from "@/lib/oh-hell/types"
import type { BridgeSettings, BridgeState } from "@/lib/bridge/types"

export type GameSettings = OhHellSettings | BridgeSettings
export type GameState = OhHellState | BridgeState

export function isOhHell(
  state: GameState
): state is OhHellState {
  return state.settings.kind === "oh-hell"
}

export function isBridge(state: GameState): state is BridgeState {
  return state.settings.kind === "bridge"
}

export function isOhHellSettings(
  settings: GameSettings
): settings is OhHellSettings {
  return settings.kind === "oh-hell"
}

export function isBridgeSettings(
  settings: GameSettings
): settings is BridgeSettings {
  return settings.kind === "bridge"
}
