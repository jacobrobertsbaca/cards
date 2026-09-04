import { sameCard } from "../cards"
import {
  continueTrick,
  legalBids,
  placeBid,
  playCard,
  trickWinner,
  wouldBeLegalPlay,
} from "../engine"
import { evaluateFormula } from "../formula"
import type { Card, GameState } from "../types"
import { sampleOtherHands, withSampledHands } from "./belief"
import type { BotBrain } from "./policy"
import {
  estimateTricks,
  heuristicBid,
  heuristicPlay,
  makeHeuristicBot,
} from "./policy"
import { TRAINED_BOT_PARAMS, type BotParams } from "./params"

export type SearchBudget = {
  bidSamples: number
  playSamples: number
  deepBidSamples: number
}

const DEFAULT_BUDGET: SearchBudget = {
  bidSamples: 120,
  playSamples: 48,
  deepBidSamples: 40,
}

let budget: SearchBudget = { ...DEFAULT_BUDGET }

export function setSearchBudget(next: Partial<SearchBudget>) {
  budget = { ...budget, ...next }
}

export function resetSearchBudget() {
  budget = { ...DEFAULT_BUDGET }
}

export function getSearchBudget() {
  return { ...budget }
}

function finishRound(state: GameState, brains: BotBrain[]): GameState {
  let next = state
  let guard = 0
  while (
    next.phase !== "round-end" &&
    next.phase !== "game-over" &&
    guard < 10_000
  ) {
    guard += 1
    if (next.phase === "trick-end") {
      next = continueTrick(next)
      continue
    }
    if (next.phase === "bidding" && next.currentSeat !== null) {
      const seat = next.currentSeat
      next = placeBid(next, seat, brains[seat].chooseBid(next, seat))
      continue
    }
    if (next.phase === "playing" && next.currentSeat !== null) {
      const seat = next.currentSeat
      next = playCard(next, seat, brains[seat].choosePlay(next, seat))
      continue
    }
    break
  }
  return next
}

function roundScoreFor(state: GameState, seat: number) {
  const last = state.history[state.history.length - 1]
  if (last) return last.scores[seat]
  return evaluateFormula(
    state.settings.scoring,
    state.bids[seat] ?? 0,
    state.tricks[seat]
  )
}

function fillBids(
  state: GameState,
  viewer: number,
  viewerBid: number,
  brains: BotBrain[]
) {
  let next = state
  let guard = 0
  while (next.phase === "bidding" && next.currentSeat !== null && guard < 32) {
    guard += 1
    const seat = next.currentSeat
    const bid = seat === viewer ? viewerBid : brains[seat].chooseBid(next, seat)
    next = placeBid(next, seat, bid)
  }
  return next
}

/** Prefer deals that make opponents' bids look plausible. */
function dealWeight(
  state: GameState,
  viewer: number,
  hands: Card[][],
  params: BotParams
) {
  let weight = 1
  for (let seat = 0; seat < state.seats.length; seat++) {
    if (seat === viewer) continue
    const bid = state.bids[seat]
    if (bid === null) continue
    const estimate = estimateTricks(hands[seat], state.trump, params)
    const err = Math.abs(estimate - bid)
    weight *= Math.exp(-err * err * 0.45)
  }
  return Math.max(0.05, weight)
}

function sampleWeightedDeal(state: GameState, viewer: number, params: BotParams) {
  let best: Card[][] | null = null
  let bestWeight = 0
  for (let attempt = 0; attempt < 8; attempt++) {
    const deal = sampleOtherHands(state, viewer)
    if (!deal) continue
    const weight = dealWeight(state, viewer, deal, params)
    if (
      !best ||
      weight > bestWeight ||
      Math.random() < weight / (bestWeight + weight)
    ) {
      best = deal
      bestWeight = weight
    }
  }
  return best ? { deal: best, weight: bestWeight } : null
}

function cardsLeftInRound(state: GameState) {
  return state.hands.reduce((sum, hand) => sum + hand.length, 0)
}

function exactEndgamePlay(
  state: GameState,
  seat: number,
  legal: Card[],
  params: BotParams
) {
  if (cardsLeftInRound(state) > state.settings.seatCount + 1) return null

  const heuristic = makeHeuristicBot(params)
  const brains = state.seats.map(() => heuristic)
  let best = legal[0]
  let bestScore = Number.NEGATIVE_INFINITY

  for (const card of legal) {
    let total = 0
    let mass = 0
    for (let i = 0; i < 20; i++) {
      const sampled = sampleWeightedDeal(state, seat, params)
      if (!sampled) continue
      const world = withSampledHands(state, seat, sampled.deal)
      const played = playCard(world, seat, card)
      total += roundScoreFor(finishRound(played, brains), seat) * sampled.weight
      mass += sampled.weight
    }
    if (mass === 0) continue
    const avg = total / mass
    if (avg > bestScore) {
      bestScore = avg
      best = card
    }
  }
  return best
}

export function searchBid(
  state: GameState,
  seat: number,
  params: BotParams = TRAINED_BOT_PARAMS
) {
  const legal = legalBids(state, seat)
  if (legal.length === 1) return legal[0]

  const heuristic = makeHeuristicBot(params)
  const brains = state.seats.map(() => heuristic)
  const seedBid = heuristicBid(state, seat, params)

  // Fast pass: empirical trick distribution under seed bid.
  const trickHistogram = new Map<number, number>()
  let mass = 0
  for (let i = 0; i < budget.bidSamples; i++) {
    const sampled = sampleWeightedDeal(state, seat, params)
    if (!sampled) continue
    const world = withSampledHands(state, seat, sampled.deal)
    const afterBids = fillBids(world, seat, seedBid, brains)
    const finished = finishRound(afterBids, brains)
    const taken =
      finished.history[finished.history.length - 1]?.tricks[seat] ??
      finished.tricks[seat]
    trickHistogram.set(
      taken,
      (trickHistogram.get(taken) ?? 0) + sampled.weight
    )
    mass += sampled.weight
  }

  if (mass === 0) return seedBid

  let meanTricks = 0
  for (const [tricks, count] of trickHistogram) {
    meanTricks += (tricks * count) / mass
  }

  // Score every legal bid against the empirical trick distribution first.
  const histEv = new Map<number, number>()
  for (const bid of legal) {
    let ev = 0
    for (const [tricks, count] of trickHistogram) {
      ev += (count / mass) * evaluateFormula(state.settings.scoring, bid, tricks)
    }
    histEv.set(bid, ev)
  }

  const ranked = [...legal].sort(
    (a, b) => (histEv.get(b) ?? 0) - (histEv.get(a) ?? 0)
  )
  const deep = ranked.filter(
    (bid, index) =>
      index < 3 ||
      Math.abs(bid - meanTricks) <= 1.25 ||
      bid === seedBid
  )

  // Deep pass: shared random deals evaluated for each candidate bid.
  const totals = new Map<number, number>()
  for (const bid of deep) totals.set(bid, 0)
  let deepMass = 0

  for (let i = 0; i < budget.deepBidSamples; i++) {
    const sampled = sampleWeightedDeal(state, seat, params)
    if (!sampled) continue
    deepMass += sampled.weight
    for (const bid of deep) {
      const world = withSampledHands(state, seat, sampled.deal)
      const afterBids = fillBids(world, seat, bid, brains)
      const finished = finishRound(afterBids, brains)
      totals.set(
        bid,
        (totals.get(bid) ?? 0) + roundScoreFor(finished, seat) * sampled.weight
      )
    }
  }

  if (deepMass === 0) {
    return ranked[0]
  }

  let best = deep[0]
  let bestAvg = Number.NEGATIVE_INFINITY
  for (const bid of deep) {
    const avg = (totals.get(bid) ?? 0) / deepMass
    if (avg > bestAvg || (avg === bestAvg && bid === seedBid)) {
      best = bid
      bestAvg = avg
    }
  }
  return best
}

export function searchPlay(
  state: GameState,
  seat: number,
  params: BotParams = TRAINED_BOT_PARAMS
) {
  const hand = state.hands[seat]
  const legal = hand.filter((card) => wouldBeLegalPlay(state, seat, card))
  if (legal.length === 0) throw new Error("Bot has no legal play")
  if (legal.length === 1) return legal[0]

  const endgame = exactEndgamePlay(state, seat, legal, params)
  if (endgame) return endgame

  const heuristic = makeHeuristicBot(params)
  const brains = state.seats.map(() => heuristic)
  const fallback = heuristicPlay(state, seat, params)

  // Cap branching: only search the top heuristic candidates when many options.
  const ranked = [...legal].sort(
    (a, b) =>
      moveHeuristic(b, state, seat, params) - moveHeuristic(a, state, seat, params)
  )
  const candidates =
    ranked.length <= 5 ? ranked : ranked.slice(0, Math.min(5, ranked.length))

  const scores = candidates.map(() => 0)
  let mass = 0

  // Common-random-numbers: each deal evaluates every candidate.
  for (let i = 0; i < budget.playSamples; i++) {
    const sampled = sampleWeightedDeal(state, seat, params)
    if (!sampled) continue
    mass += sampled.weight
    for (let c = 0; c < candidates.length; c++) {
      const world = withSampledHands(state, seat, sampled.deal)
      const played = playCard(world, seat, candidates[c])
      scores[c] +=
        roundScoreFor(finishRound(played, brains), seat) * sampled.weight
    }
  }

  if (mass === 0) return fallback

  let bestIndex = 0
  let bestAvg = Number.NEGATIVE_INFINITY
  for (let c = 0; c < candidates.length; c++) {
    const avg = scores[c] / mass
    const isFallback = sameCard(candidates[c], fallback)
    if (avg > bestAvg || (avg === bestAvg && isFallback)) {
      bestAvg = avg
      bestIndex = c
    }
  }
  return candidates[bestIndex]
}

function moveHeuristic(
  card: Card,
  state: GameState,
  seat: number,
  params: BotParams
) {
  const pick = heuristicPlay(state, seat, params)
  if (sameCard(pick, card)) return 1_000
  const need = (state.bids[seat] ?? 0) - state.tricks[seat]
  const wins =
    state.currentTrick.length > 0 &&
    trickWinner([...state.currentTrick, { seat, card }], state.trump) === seat
  let score = 0
  if (need > 0 && wins) score += 50
  if (need <= 0 && !wins) score += 40
  score -= Math.abs(need) * 2
  return score
}

export function makeSearchBot(params: BotParams = TRAINED_BOT_PARAMS): BotBrain {
  return {
    chooseBid: (state, seat) => searchBid(state, seat, params),
    choosePlay: (state, seat) => searchPlay(state, seat, params),
  }
}
