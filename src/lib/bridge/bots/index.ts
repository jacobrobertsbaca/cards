import { rankValue } from "@/lib/game/cards"
import type { Card } from "@/lib/game/types"
import {
  actingSeatFor,
  legalBridgeCalls,
  wouldBeLegalBridgePlay,
} from "../engine"
import {
  strainRank,
  type BridgeCall,
  type BridgeState,
  type BridgeStrain,
} from "../types"

const HCP: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 }

function highCardPoints(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + (HCP[card.rank] ?? 0), 0)
}

function suitLength(hand: Card[], suit: BridgeStrain): number {
  if (suit === "notrump") return 0
  return hand.filter((card) => card.suit === suit).length
}

function longestSuit(hand: Card[]): { suit: BridgeStrain; length: number } {
  const suits: BridgeStrain[] = ["spades", "hearts", "diamonds", "clubs"]
  let best: { suit: BridgeStrain; length: number } = {
    suit: "clubs",
    length: -1,
  }
  for (const suit of suits) {
    const length = suitLength(hand, suit)
    if (length > best.length) best = { suit, length }
  }
  return best
}

/** Simple rubber-bridge bot: HCP / shape heuristics for auction, low-card follow for play. */
export function chooseBridgeCall(state: BridgeState, seat: number): BridgeCall {
  const legal = legalBridgeCalls(state, seat)
  if (legal.length === 0) return { type: "pass" }

  const hand = state.hands[seat]
  const hcp = highCardPoints(hand)
  const long = longestSuit(hand)

  const bids = legal.filter((c): c is Extract<BridgeCall, { type: "bid" }> => c.type === "bid")
  const canDouble = legal.some((c) => c.type === "double")
  const canRedouble = legal.some((c) => c.type === "redouble")

  if (canRedouble && hcp >= 12) return { type: "redouble" }
  if (canDouble && hcp >= 16) return { type: "double" }

  if (bids.length === 0) return { type: "pass" }

  // Opening / competing: need roughly 12+ HCP, or shapely 10+
  const minHcp = long.length >= 6 ? 10 : 12
  if (hcp < minHcp) return { type: "pass" }

  let level = 1
  if (hcp >= 22) level = 3
  else if (hcp >= 18) level = 2
  else if (hcp >= 15 && long.length >= 5) level = 2

  const preferNt = hcp >= 15 && long.length <= 4
  const preferredStrain: BridgeStrain = preferNt ? "notrump" : long.suit

  const preferred = bids
    .filter((b) => b.level <= level)
    .sort((a, b) => {
      const aPref = a.strain === preferredStrain ? 1 : 0
      const bPref = b.strain === preferredStrain ? 1 : 0
      if (aPref !== bPref) return bPref - aPref
      if (a.level !== b.level) return b.level - a.level
      return strainRank(b.strain) - strainRank(a.strain)
    })

  if (preferred[0]) return preferred[0]

  // If we already have a fit auction going and we're strong, raise cheapest preferred
  const cheapest = [...bids].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return strainRank(a.strain) - strainRank(b.strain)
  })[0]
  if (cheapest && hcp >= 16 && cheapest.level <= 3) return cheapest

  return { type: "pass" }
}

export function chooseBridgePlay(state: BridgeState, seat: number): Card {
  const from = actingSeatFor(state, seat) ?? seat
  const hand = state.hands[from]
  const legal = hand.filter((card) => wouldBeLegalBridgePlay(state, seat, card))
  if (legal.length === 0) return hand[0]

  const led = state.currentTrick[0]?.card
  if (!led) {
    // Lead low from longest suit, prefer non-trump if possible
    const bySuit = new Map<string, Card[]>()
    for (const card of legal) {
      const list = bySuit.get(card.suit) ?? []
      list.push(card)
      bySuit.set(card.suit, list)
    }
    let bestSuit = legal[0].suit
    let bestLen = -1
    for (const [suit, cards] of bySuit) {
      if (state.trumpSuit && suit === state.trumpSuit && bySuit.size > 1) continue
      if (cards.length > bestLen) {
        bestLen = cards.length
        bestSuit = suit as Card["suit"]
      }
    }
    const suitCards = bySuit.get(bestSuit) ?? legal
    return [...suitCards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
  }

  // Follow: play lowest winning card if possible, else dump low
  const trump = state.trumpSuit
  const winners = legal.filter((card) => {
    if (trump && card.suit === trump) {
      return !legal.some(
        (other) =>
          other.suit === trump &&
          rankValue(other.rank) > rankValue(card.rank) &&
          other !== card
      )
        ? rankValue(card.rank) >
            Math.max(
              0,
              ...state.currentTrick
                .filter((p) => p.card.suit === trump)
                .map((p) => rankValue(p.card.rank))
            )
        : true
    }
    if (card.suit !== led.suit) return false
    const ledHigh = Math.max(
      0,
      ...state.currentTrick
        .filter((p) => p.card.suit === led.suit && (!trump || p.card.suit !== trump))
        .map((p) => rankValue(p.card.rank))
    )
    const trumpPlayed = trump
      ? state.currentTrick.some((p) => p.card.suit === trump)
      : false
    if (trumpPlayed) return false
    return rankValue(card.rank) > ledHigh
  })

  if (winners.length > 0) {
    return [...winners].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
  }

  return [...legal].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
}

export function isBridgeBotSeat(seat: { isBot: boolean; playerId: string | null }) {
  return Boolean(seat.isBot && seat.playerId)
}
