import { cardKey, createDeck, shuffle } from "../cards"
import type { Card, GameState, Suit } from "../types"

/** Visible card counts are public; contents of other hands are never read. */
export function publicHandSize(state: GameState, seat: number) {
  return state.hands[seat].length
}

export function viewerHand(state: GameState, seat: number): Card[] {
  return state.hands[seat]
}

export function inferVoids(state: GameState): Array<Set<Suit>> {
  const voids = state.seats.map(() => new Set<Suit>())
  for (const trick of [state.lastTrick, state.currentTrick]) {
    if (trick.length === 0) continue
    const led = trick[0]?.card.suit
    if (!led) continue
    for (const play of trick.slice(1)) {
      if (play.card.suit !== led) voids[play.seat].add(led)
    }
  }
  return voids
}

function knownPublicCards(state: GameState, viewer: number) {
  const keys = new Set<string>()
  for (const card of viewerHand(state, viewer)) keys.add(cardKey(card))
  if (state.trump) keys.add(cardKey(state.trump))
  for (const play of state.currentTrick) keys.add(cardKey(play.card))
  for (const play of state.lastTrick) keys.add(cardKey(play.card))
  return keys
}

/** Unknown cards: full deck minus own hand, trump, and visible played cards. */
export function unknownPool(state: GameState, viewer: number): Card[] {
  const known = knownPublicCards(state, viewer)
  return createDeck().filter((card) => !known.has(cardKey(card)))
}

function canTake(card: Card, voids: Set<Suit>) {
  return !voids.has(card.suit)
}

/**
 * Sample a deal consistent with public info only (hand sizes + inferred voids).
 * Does not inspect other players' real cards.
 */
export function sampleOtherHands(
  state: GameState,
  viewer: number,
  maxAttempts = 40
): Card[][] | null {
  const voids = inferVoids(state)
  const sizes = state.seats.map((_, seat) => publicHandSize(state, seat))
  const pool = unknownPool(state, viewer)
  const need = sizes.reduce((sum, size, seat) => (seat === viewer ? sum : sum + size), 0)
  if (pool.length < need) return null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cards = shuffle(pool)
    const hands: Card[][] = state.seats.map(() => [])
    hands[viewer] = viewerHand(state, viewer).map((card) => ({ ...card }))
    let failed = false

    for (let seat = 0; seat < state.seats.length; seat++) {
      if (seat === viewer) continue
      const target = sizes[seat]
      const voided = voids[seat]
      const taken: Card[] = []
      const rest: Card[] = []
      for (const card of cards) {
        if (taken.length < target && canTake(card, voided)) taken.push(card)
        else rest.push(card)
      }
      if (taken.length < target) {
        failed = true
        break
      }
      hands[seat] = taken
      cards.length = 0
      cards.push(...rest)
    }

    if (!failed) return hands
  }

  // Fallback: ignore voids if constraints are over-tight given forgotten early tricks.
  const cards = shuffle(pool)
  const hands: Card[][] = state.seats.map(() => [])
  hands[viewer] = viewerHand(state, viewer).map((card) => ({ ...card }))
  let offset = 0
  for (let seat = 0; seat < state.seats.length; seat++) {
    if (seat === viewer) continue
    const size = sizes[seat]
    hands[seat] = cards.slice(offset, offset + size)
    offset += size
  }
  return hands
}

export function withSampledHands(
  state: GameState,
  viewer: number,
  hands: Card[][]
): GameState {
  const next = structuredClone(state)
  for (let seat = 0; seat < next.seats.length; seat++) {
    if (seat === viewer) continue
    next.hands[seat] = hands[seat].map((card) => ({ ...card }))
  }
  return next
}
