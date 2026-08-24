import { rankValue } from "../cards"
import {
  cardsThisRound,
  forbiddenDealerBid,
  legalBids,
  trickWinner,
  wouldBeLegalPlay,
} from "../engine"
import type { Card, GameState, Seat, Suit, TrickPlay } from "../types"
import { TRAINED_BOT_PARAMS, type BotParams } from "./params"

export function isBotSeat(seat: Seat) {
  return seat.isBot === true
}

export function shouldRunBotController(state: GameState, mySeatIndex: number) {
  const humanSeats = state.seats
    .filter((seat) => seat.playerId && !isBotSeat(seat))
    .map((seat) => seat.index)
  if (humanSeats.length === 0) return false
  return Math.min(...humanSeats) === mySeatIndex
}

const ACTIVE_PARAMS = TRAINED_BOT_PARAMS

export function createParamBot(params: BotParams) {
  return {
    chooseBid: (state: GameState, seat: number) => chooseBidWithParams(state, seat, params),
    choosePlay: (state: GameState, seat: number) => choosePlayWithParams(state, seat, params),
  }
}

export function chooseBid(state: GameState, seat: number) {
  return chooseBidWithParams(state, seat, ACTIVE_PARAMS)
}

export function choosePlay(state: GameState, seat: number) {
  return choosePlayWithParams(state, seat, ACTIVE_PARAMS)
}

function cardsBySuit(hand: Card[]) {
  const groups = new Map<Suit, Card[]>()
  for (const card of hand) {
    const group = groups.get(card.suit) ?? []
    group.push(card)
    groups.set(card.suit, group)
  }
  for (const group of groups.values()) {
    group.sort((a, b) => rankValue(b.rank) - rankValue(a.rank))
  }
  return groups
}

function rankWeight(rank: number, params: BotParams, trump: boolean) {
  if (trump) {
    if (rank >= 14) return params.trumpAce
    if (rank >= 13) return params.trumpKing
    if (rank >= 12) return params.trumpQueen
    if (rank >= 11) return params.trumpJack
    return params.trumpLow
  }
  if (rank >= 14) return params.ace
  if (rank >= 13) return params.king
  if (rank >= 12) return params.queen
  if (rank >= 11) return params.jack
  return 0.05
}

function estimateTricks(hand: Card[], trump: Card | null, params: BotParams) {
  const trumpSuit = trump?.suit
  const groups = cardsBySuit(hand)
  let estimate = 0

  for (const [suit, cards] of groups) {
    const isTrump = trumpSuit !== undefined && suit === trumpSuit
    for (const card of cards) {
      estimate += rankWeight(rankValue(card.rank), params, isTrump)
    }

    const len = cards.length
    if (len >= 3) {
      estimate += (len - 2) * params.longSuitPerCard
    } else if (len === 1) {
      estimate -= params.shortSuitPenalty
    }
  }

  const nonTrumpSuits = [...groups.keys()].filter((suit) => suit !== trumpSuit)
  if (trumpSuit && groups.has(trumpSuit) && nonTrumpSuits.length < 3) {
    estimate += params.voidBonus * (3 - nonTrumpSuits.length)
  }

  return estimate
}

function nearestLegalBid(legal: number[], target: number) {
  return legal.reduce((best, bid) =>
    Math.abs(bid - target) < Math.abs(best - target) ? bid : best
  )
}

function hookAwareBid(
  estimate: number,
  state: GameState,
  seat: number,
  params: BotParams
) {
  const legal = legalBids(state, seat)
  if (legal.length === 0) {
    throw new Error("Bot has no legal bids")
  }

  const max = cardsThisRound(state)
  let target = Math.round(estimate * (1 - params.bidConservatism))
  target = Math.max(0, Math.min(max, target))

  const forbidden = forbiddenDealerBid(state)
  if (forbidden !== null && seat === state.dealer) {
    const lower = legal.filter((bid) => bid < forbidden)
    const higher = legal.filter((bid) => bid > forbidden)

    if (target === forbidden || !legal.includes(target)) {
      if (params.hookPush >= 0.5 && lower.length > 0 && higher.length > 0) {
        target =
          estimate > forbidden
            ? Math.min(...higher)
            : estimate < forbidden
              ? Math.max(...lower)
              : nearestLegalBid(legal, estimate)
      } else {
        target = nearestLegalBid(legal, estimate)
      }
    }
  }

  const bid = legal.includes(target) ? target : nearestLegalBid(legal, target)
  if (forbidden !== null && seat === state.dealer && bid === forbidden) {
    throw new Error(`Bot violated hook rule with bid ${bid}`)
  }
  return bid
}

function chooseBidWithParams(state: GameState, seat: number, params: BotParams) {
  const hand = state.hands[seat]
  const estimate = estimateTricks(hand, state.trump, params)

  const placed = state.bids.filter((bid): bid is number => bid !== null)
  if (placed.length > 0) {
    const cards = cardsThisRound(state)
    const tablePressure = placed.reduce((sum, bid) => sum + bid, 0) / placed.length
    if (tablePressure > cards * 0.55) {
      return hookAwareBid(estimate * 0.92, state, seat, params)
    }
    if (tablePressure < cards * 0.35) {
      return hookAwareBid(estimate * 1.06, state, seat, params)
    }
  }

  return hookAwareBid(estimate, state, seat, params)
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

function highestCard(cards: Card[]) {
  return [...cards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank))[0]
}

function nonTrumpCards(cards: Card[], trump: Card | null) {
  const suit = trump?.suit
  if (!suit) return cards
  return cards.filter((card) => card.suit !== suit)
}

function playNeed(state: GameState, seat: number) {
  const bid = state.bids[seat] ?? 0
  const tricksWon = state.tricks[seat]
  const cardsLeft = state.hands[seat].length
  return {
    bid,
    tricksWon,
    need: bid - tricksWon,
    cardsLeft,
    mustWinAll: bid - tricksWon >= cardsLeft,
    mustLoseAll: bid - tricksWon <= 0 && cardsLeft > 0,
  }
}

function scoreFollowPlay(
  card: Card,
  state: GameState,
  seat: number,
  params: BotParams
) {
  const { need, cardsLeft, mustWinAll, mustLoseAll } = playNeed(state, seat)
  const wins = wouldWinTrick(state.currentTrick, state.trump, seat, card)
  const rank = rankValue(card.rank)
  const isTrump =
    state.trump !== null && card.suit === state.trump.suit
  let score = 0

  if (mustWinAll) {
    score += wins ? 1000 - rank * params.winWithLowRank : -1000
    return score
  }
  if (mustLoseAll) {
    score += wins ? -1000 : 1000 + rank * params.loseWithHighRank
    return score
  }

  if (need > 0) {
    if (wins) score += 120 - rank * params.winWithLowRank
    else score -= 80 + rank
  } else {
    if (wins) score -= 120 + rank * params.loseWithHighRank
    else score += 80 + rank * params.loseWithHighRank
  }

  if (isTrump && need <= 0) {
    score -= params.trumpOnlyWhenNeed * 40
  }
  if (isTrump && need > 0 && wins) {
    score -= rank * 0.2
  }

  const led = state.currentTrick[0]?.card
  if (led && card.suit !== led.suit && !wins && need > 0) {
    score -= 25
  }

  if (cardsLeft === 1 && need === 1 && wins) score += 200
  if (cardsLeft === 1 && need === 0 && !wins) score += 200

  return score
}

function pickFollowCard(
  legal: Card[],
  state: GameState,
  seat: number,
  params: BotParams
) {
  return [...legal].sort(
    (a, b) =>
      scoreFollowPlay(b, state, seat, params) -
      scoreFollowPlay(a, state, seat, params)
  )[0]
}

function scoreLeadPlay(card: Card, state: GameState, seat: number, params: BotParams) {
  const { need, cardsLeft, mustWinAll, mustLoseAll } = playNeed(state, seat)
  const rank = rankValue(card.rank)
  const isTrump = state.trump !== null && card.suit === state.trump.suit
  const hand = state.hands[seat]
  const suitLen = hand.filter((item) => item.suit === card.suit).length
  let score = 0

  if (mustWinAll) {
    score += rank * params.leadWinnerRank
    if (suitLen >= 3) score += params.longSuitPerCard * 40
    return score
  }
  if (mustLoseAll) {
    score -= rank * params.leadLoserRank
    if (suitLen === 1) score += 30
    return score
  }

  if (need > 0) {
    score += rank * params.leadWinnerRank
    if (suitLen >= 3) score += params.longSuitPerCard * 35
    if (isTrump) score -= 15
  } else {
    score -= rank * params.leadLoserRank
    if (suitLen === 1) score += 25
    if (suitLen >= 4) score -= 20
    if (isTrump) score -= 40
  }

  if (cardsLeft <= 2 && need > 0) score += rank * 0.5

  return score
}

function leadPool(legal: Card[], state: GameState) {
  const mustAvoidTrump =
    state.settings.leadTrump === "after-broken" &&
    !state.trumpBroken &&
    state.trump !== null
  if (!mustAvoidTrump) return legal

  const trumpSafe = nonTrumpCards(legal, state.trump)
  return trumpSafe.length > 0 ? trumpSafe : legal
}

function pickLeadCard(
  legal: Card[],
  state: GameState,
  seat: number,
  params: BotParams
) {
  const pool = leadPool(legal, state)

  return [...pool].sort(
    (a, b) =>
      scoreLeadPlay(b, state, seat, params) - scoreLeadPlay(a, state, seat, params)
  )[0]
}

function choosePlayWithParams(
  state: GameState,
  seat: number,
  params: BotParams
) {
  const hand = state.hands[seat]
  const legal = hand.filter((card) => wouldBeLegalPlay(state, seat, card))
  if (legal.length === 0) {
    throw new Error("Bot has no legal play")
  }

  if (state.currentTrick.length === 0) {
    const card = pickLeadCard(legal, state, seat, params)
    if (!wouldBeLegalPlay(state, seat, card)) {
      throw new Error("Bot chose illegal lead")
    }
    return card
  }

  const { mustWinAll, mustLoseAll } = playNeed(state, seat)
  const winning = legal.filter((card) =>
    wouldWinTrick(state.currentTrick, state.trump, seat, card)
  )
  const losing = legal.filter(
    (card) => !wouldWinTrick(state.currentTrick, state.trump, seat, card)
  )

  let card: Card
  if (mustWinAll && winning.length > 0) card = lowestCard(winning)
  else if (mustLoseAll && losing.length > 0) card = highestCard(losing)
  else card = pickFollowCard(legal, state, seat, params)

  if (!wouldBeLegalPlay(state, seat, card)) {
    throw new Error("Bot chose illegal play")
  }
  return card
}
