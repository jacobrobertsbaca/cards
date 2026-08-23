import { RANKS, SUITS, type Card, type Rank, type Suit } from "./types"

const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

const SUIT_ORDER: Record<Suit, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

export function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function rankValue(rank: Rank) {
  return RANK_VALUE[rank]
}

export function compareCards(a: Card, b: Card) {
  const suit = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
  if (suit !== 0) return suit
  return RANK_VALUE[a.rank] - RANK_VALUE[b.rank]
}

export function sortHand(hand: Card[]) {
  return [...hand].sort(compareCards)
}

export function cardKey(card: Card) {
  return `${card.rank}${card.suit}`
}

export function sameCard(a: Card, b: Card) {
  return a.suit === b.suit && a.rank === b.rank
}

export function maxHandSize(seatCount: number) {
  return Math.floor(51 / seatCount)
}

export const SUIT_GLYPH: Record<Suit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
}

export const SUIT_LABEL: Record<Suit, string> = {
  clubs: "Clubs",
  diamonds: "Diamonds",
  hearts: "Hearts",
  spades: "Spades",
}
