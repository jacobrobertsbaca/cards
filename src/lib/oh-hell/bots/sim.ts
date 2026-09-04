import { rankValue } from "@/lib/game/cards"
import {
  continueTrick,
  createGame,
  forbiddenDealerBid,
  joinGame,
  legalBids,
  placeBid,
  playCard,
  startGame,
  startRound,
  trickWinner,
  wouldBeLegalPlay,
} from "../engine"
import type { Card } from "@/lib/game/types"
import type { OhHellSettings as GameSettings, OhHellState as GameState } from "../types"
import type { BotParams } from "./params"
import { DEFAULT_BOT_PARAMS, TRAINED_BOT_PARAMS } from "./params"
import type { BotBrain } from "./policy"
import { heuristicPlay, makeHeuristicBot } from "./policy"
import { searchBid, searchPlay } from "./search"

export type { BotBrain }

function legacyHandStrength(hand: Card[], trump: Card | null) {
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

function legacyLowest(cards: Card[]) {
  return [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
}

function legacyWouldWin(
  trick: { seat: number; card: Card }[],
  trump: Card | null,
  seat: number,
  card: Card
) {
  return trickWinner([...trick, { seat, card }], trump) === seat
}

function legacyLeadPool(legal: Card[], state: GameState) {
  const mustAvoidTrump =
    state.settings.leadTrump === "after-broken" &&
    !state.trumpBroken &&
    state.trump !== null
  if (!mustAvoidTrump) return legal

  const trumpSuit = state.trump?.suit
  const trumpSafe = trumpSuit
    ? legal.filter((card) => card.suit !== trumpSuit)
    : legal
  return trumpSafe.length > 0 ? trumpSafe : legal
}

function legacyNearestLegalBid(legal: number[], target: number) {
  return legal.reduce((best, bid) =>
    Math.abs(bid - target) < Math.abs(best - target) ? bid : best
  )
}

export const LEGACY_BOT: BotBrain = {
  chooseBid(state, seat) {
    const legal = legalBids(state, seat)
    const hand = state.hands[seat]
    let estimate = Math.round(legacyHandStrength(hand, state.trump))
    if (estimate > 0 && Math.random() < 0.3) estimate -= 1
    estimate = Math.max(0, Math.min(hand.length, estimate))

    const forbidden = forbiddenDealerBid(state)
    if (forbidden !== null && seat === state.dealer && !legal.includes(estimate)) {
      estimate = legacyNearestLegalBid(legal, estimate)
    }

    if (legal.includes(estimate)) return estimate
    return legacyNearestLegalBid(legal, estimate)
  },

  choosePlay(state, seat) {
    const hand = state.hands[seat]
    const legal = hand.filter((card) => wouldBeLegalPlay(state, seat, card))
    if (legal.length === 0) throw new Error("No legal play")

    const bid = state.bids[seat] ?? 0
    const tricksWon = state.tricks[seat]
    const need = bid - tricksWon

    if (state.currentTrick.length === 0) {
      const cards = legacyLeadPool(legal, state)
      if (need > 0) {
        return [...cards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank))[0]
      }

      const bySuit = new Map<string, Card[]>()
      for (const card of cards) {
        const group = bySuit.get(card.suit) ?? []
        group.push(card)
        bySuit.set(card.suit, group)
      }
      const suits = [...bySuit.values()].sort((a, b) => a.length - b.length)
      return legacyLowest(suits[0] ?? cards)
    }

    const winning = legal.filter((card) =>
      legacyWouldWin(state.currentTrick, state.trump, seat, card)
    )
    const losing = legal.filter(
      (card) => !legacyWouldWin(state.currentTrick, state.trump, seat, card)
    )
    if (need > 0 && winning.length > 0) return legacyLowest(winning)
    if (need <= 0 && losing.length > 0) return legacyLowest(losing)
    return legacyLowest(legal)
  },
}

export function defaultSettings(): GameSettings {
  return {
    kind: "oh-hell",
    seatCount: 4,
    pattern: [5, 4, 3, 2, 1, 1, 2, 3, 4, 5],
    leadTrump: "after-broken",
    hook: true,
    scoring: { made: "10 + t", miss: "t" },
  }
}

export const TRAINING_SETTINGS: GameSettings[] = [
  defaultSettings(),
  {
    ...defaultSettings(),
    seatCount: 2,
    pattern: [5, 4, 3, 2, 1, 1, 2, 3, 4, 5],
  },
  {
    ...defaultSettings(),
    seatCount: 3,
    pattern: [4, 3, 2, 1, 2, 3, 4],
  },
  {
    ...defaultSettings(),
    seatCount: 5,
    pattern: [3, 2, 1, 1, 2, 3],
  },
]

export function assertBotBid(state: GameState, seat: number, bid: number) {
  const legal = legalBids(state, seat)
  if (!legal.includes(bid)) {
    throw new Error(`Bot bid ${bid} is not legal for seat ${seat}`)
  }
  const forbidden = forbiddenDealerBid(state)
  if (forbidden !== null && seat === state.dealer && bid === forbidden) {
    throw new Error(`Bot bid ${bid} violates the hook rule`)
  }
}

export function assertBotPlay(state: GameState, seat: number, card: Card) {
  if (!wouldBeLegalPlay(state, seat, card)) {
    throw new Error(`Bot play ${card.rank}${card.suit} is not legal for seat ${seat}`)
  }
}

export function advanceSimulation(state: GameState, brains: BotBrain[]): GameState {
  if (state.phase === "trick-end") return continueTrick(state)
  if (state.phase === "round-end") return startRound(state)
  if (state.phase === "game-over") return state

  const seat = state.currentSeat
  if (seat === null) return state

  const brain = brains[seat] ?? LEGACY_BOT
  if (state.phase === "bidding") {
    const bid = brain.chooseBid(state, seat)
    assertBotBid(state, seat, bid)
    return placeBid(state, seat, bid)
  }
  if (state.phase === "playing") {
    const card = brain.choosePlay(state, seat)
    assertBotPlay(state, seat, card)
    return playCard(state, seat, card)
  }
  return state
}

export function runSimulation(
  brains: BotBrain[],
  settings: GameSettings = defaultSettings(),
  maxSteps = 20_000
) {
  let state = createGame(settings)
  for (let seat = 0; seat < settings.seatCount; seat++) {
    state = joinGame(state, `p${seat}`, `Player ${seat + 1}`)
  }
  state = startGame(state)

  let steps = 0
  while (state.phase !== "game-over" && steps < maxSteps) {
    state = advanceSimulation(state, brains)
    steps += 1
  }
  if (state.phase !== "game-over") {
    throw new Error("Simulation did not finish")
  }
  return state
}

export function runCandidateVsLegacy(
  candidate: BotBrain,
  games: number,
  settings: GameSettings = defaultSettings()
) {
  const totals = Array.from({ length: settings.seatCount }, () => 0)
  for (let game = 0; game < games; game++) {
    const brains = Array.from({ length: settings.seatCount }, (_, seat) =>
      seat === 0 ? candidate : LEGACY_BOT
    )
    const state = runSimulation(brains, settings)
    for (let seat = 0; seat < settings.seatCount; seat++) {
      totals[seat] += state.scores[seat]
    }
  }
  return totals
}

export function makeParamBot(params: BotParams): BotBrain {
  return makeHeuristicBot(params)
}

function needsDeepPlaySearch(state: GameState, seat: number) {
  const bid = state.bids[seat] ?? 0
  const tricks = state.tricks[seat]
  const need = bid - tricks
  const left = state.hands[seat].length
  if (left <= 2) return true
  if (need >= left || need <= 0) return true
  if (Math.abs(need) <= 1 && left <= 4) return true
  if (state.currentTrick.length === state.settings.seatCount - 1) return true
  return false
}

export function makeStrongBot(params: BotParams = TRAINED_BOT_PARAMS): BotBrain {
  const active = params
  return {
    chooseBid: (state, seat) => searchBid(state, seat, active),
    choosePlay: (state, seat) =>
      needsDeepPlaySearch(state, seat)
        ? searchPlay(state, seat, active)
        : heuristicPlay(state, seat, active),
  }
}

export function evaluateParams(params: BotParams, games: number) {
  let total = 0
  for (const settings of TRAINING_SETTINGS) {
    total += runCandidateVsLegacy(makeParamBot(params), games, settings)[0]
  }
  return total / TRAINING_SETTINGS.length
}

export function mutateParams(
  params: BotParams,
  rate: number,
  scale: number
): BotParams {
  const next = { ...params }
  const floors: Partial<BotParams> = {
    ace: 0.45,
    king: 0.15,
    trumpAce: 0.85,
    trumpKing: 0.55,
    voidBonus: 0.1,
    winWithLowRank: 0.8,
    loseWithHighRank: 0.8,
  }
  for (const key of Object.keys(next) as (keyof BotParams)[]) {
    if (Math.random() > rate) continue
    const delta = (Math.random() * 2 - 1) * scale
    next[key] = Math.max(floors[key] ?? 0, next[key] + delta)
  }
  return next
}

export function crossover(a: BotParams, b: BotParams): BotParams {
  const next = { ...a }
  for (const key of Object.keys(next) as (keyof BotParams)[]) {
    next[key] = Math.random() < 0.5 ? a[key] : b[key]
  }
  return next
}

export function evolveParams(options: {
  generations: number
  population: number
  gamesPerCandidate: number
  seed?: BotParams
}) {
  const base = options.seed ?? DEFAULT_BOT_PARAMS
  let population = Array.from({ length: options.population }, () =>
    mutateParams(base, 1, 0.18)
  )

  let best = base
  let bestScore = evaluateParams(base, options.gamesPerCandidate)

  for (let generation = 0; generation < options.generations; generation++) {
    const scored = population.map((params) => ({
      params,
      score: evaluateParams(params, options.gamesPerCandidate),
    }))
    scored.sort((a, b) => b.score - a.score)

    if (scored[0].score > bestScore) {
      best = scored[0].params
      bestScore = scored[0].score
    }

    const survivors = scored.slice(0, Math.max(3, Math.floor(population.length / 3)))
    const nextGen: BotParams[] = [best, survivors[0].params, survivors[1]?.params ?? best]
    while (nextGen.length < options.population) {
      const left = survivors[Math.floor(Math.random() * survivors.length)].params
      const right = survivors[Math.floor(Math.random() * survivors.length)].params
      const child = mutateParams(crossover(left, right), 0.7, 0.1)
      nextGen.push(mutateParams(child, 0.35, 0.06))
    }
    population = nextGen
  }

  return { params: best, score: bestScore }
}
