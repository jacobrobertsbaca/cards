import { rankValue } from "./cards"
import {
  legalBids,
  trickWinner,
  wouldBeLegalPlay,
} from "./engine"
import type { Card, GameState, Seat, TrickPlay } from "./types"

export function isBotSeat(seat: Seat) {
  return seat.isBot === true
}

function handStrength(hand: Card[], trump: Card | null) {
  const trumpSuit = trump?.suit
  let strength = 0

  for (const card of hand) {
    const rank = rankValue(card.rank)
    const isTrump = trumpSuit !== undefined && card.suit === trumpSuit
    if (isTrump) {
      if (rank >= 13) strength += 0.95
      else if (rank >= 11) strength += 0.65
      else if (rank >= 9) strength += 0.4
      else strength += 0.2
      continue
    }
    if (rank >= 14) strength += 0.85
    else if (rank >= 13) strength += 0.5
    else if (rank >= 12) strength += 0.3
    else if (rank >= 11) strength += 0.18
  }

  return strength
}

export function chooseBid(state: GameState, seat: number) {
  const hand = state.hands[seat]
  let estimate = Math.round(handStrength(hand, state.trump))
  if (estimate > 0 && Math.random() < 0.3) estimate -= 1
  estimate = Math.max(0, Math.min(hand.length, estimate))

  const legal = legalBids(state, seat)
  if (legal.includes(estimate)) return estimate

  return legal.reduce((best, bid) =>
    Math.abs(bid - estimate) < Math.abs(best - estimate) ? bid : best
  )
}

function wouldWinTrick(
  trick: TrickPlay[],
  trump: Card | null,
  seat: number,
  card: Card
) {
  return trickWinner([...trick, { seat, card }], trump) === seat
}

function lowestCard(cards: Card[]) {
  return [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
}

function pickLeadCard(legal: Card[], trump: Card | null) {
  const trumpSuit = trump?.suit
  const nonTrump = legal.filter((card) => !trumpSuit || card.suit !== trumpSuit)
  const pool = nonTrump.length > 0 ? nonTrump : legal
  const bySuit = new Map<string, Card[]>()

  for (const card of pool) {
    const group = bySuit.get(card.suit) ?? []
    group.push(card)
    bySuit.set(card.suit, group)
  }

  const suits = [...bySuit.values()].sort((a, b) => a.length - b.length)
  return lowestCard(suits[0] ?? pool)
}

function pickFollowCard(
  legal: Card[],
  trick: TrickPlay[],
  trump: Card | null,
  seat: number,
  bid: number,
  tricksWon: number
) {
  const need = bid - tricksWon
  const winning = legal.filter((card) => wouldWinTrick(trick, trump, seat, card))
  const losing = legal.filter((card) => !wouldWinTrick(trick, trump, seat, card))

  if (need > 0 && winning.length > 0) {
    return lowestCard(winning)
  }
  if (need <= 0 && losing.length > 0) {
    return lowestCard(losing)
  }
  return lowestCard(legal)
}

export function choosePlay(state: GameState, seat: number) {
  const hand = state.hands[seat]
  const legal = hand.filter((card) => wouldBeLegalPlay(state, seat, card))
  if (legal.length === 0) {
    throw new Error("Bot has no legal play")
  }

  if (state.currentTrick.length === 0) {
    const bid = state.bids[seat] ?? 0
    const tricksWon = state.tricks[seat]
    if (bid - tricksWon > 0) {
      const trumpSuit = state.trump?.suit
      const nonTrump = legal.filter(
        (card) => !trumpSuit || card.suit !== trumpSuit
      )
      const pool = nonTrump.length > 0 ? nonTrump : legal
      return [...pool].sort((a, b) => rankValue(b.rank) - rankValue(a.rank))[0]
    }
    return pickLeadCard(legal, state.trump)
  }

  return pickFollowCard(
    legal,
    state.currentTrick,
    state.trump,
    seat,
    state.bids[seat] ?? 0,
    state.tricks[seat]
  )
}

export function shouldRunBotController(state: GameState, mySeatIndex: number) {
  const humanSeats = state.seats
    .filter((seat) => seat.playerId && !isBotSeat(seat))
    .map((seat) => seat.index)
  if (humanSeats.length === 0) return false
  return Math.min(...humanSeats) === mySeatIndex
}
