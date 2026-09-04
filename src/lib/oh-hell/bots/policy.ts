import { rankValue } from "../cards"
import {
  cardsThisRound,
  forbiddenDealerBid,
  legalBids,
  trickWinner,
  wouldBeLegalPlay,
} from "../engine"
import type { Card, GameState, Suit, TrickPlay } from "../types"
import type { BotParams } from "./params"
import { DEFAULT_BOT_PARAMS } from "./params"

export type BotBrain = {
  chooseBid: (state: GameState, seat: number) => number
  choosePlay: (state: GameState, seat: number) => Card
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
  return 0.04
}

/**
 * Trick estimate from public info only (own hand + trump).
 * Counts sure winners, then probable ones from length/voids.
 */
export function estimateTricks(
  hand: Card[],
  trump: Card | null,
  params: BotParams,
  seatCount = 4
) {
  const trumpSuit = trump?.suit
  const groups = cardsBySuit(hand)
  const cards = hand.length
  if (cards === 0) return 0

  let estimate = 0
  let trumpLen = trumpSuit ? (groups.get(trumpSuit)?.length ?? 0) : 0

  for (const [suit, suited] of groups) {
    const isTrump = trumpSuit !== undefined && suit === trumpSuit
    for (let i = 0; i < suited.length; i++) {
      const rank = rankValue(suited[i].rank)
      let value = rankWeight(rank, params, isTrump)
      // Contiguous top cards in a suit are more reliable winners.
      if (i === 0 && rank >= 14) value += isTrump ? 0.08 : 0.12
      if (i === 1 && rank >= 13 && rankValue(suited[0].rank) >= 14) {
        value += isTrump ? 0.12 : 0.08
      }
      estimate += value
    }

    if (!isTrump && suited.length >= 4) {
      estimate += (suited.length - 3) * params.longSuitPerCard * 0.7
    }
    if (!isTrump && suited.length === 1 && rankValue(suited[0].rank) < 11) {
      estimate -= params.shortSuitPenalty
    }
  }

  const nonTrumpSuits = [...groups.keys()].filter((suit) => suit !== trumpSuit)
  const voidCount = 3 - nonTrumpSuits.length
  if (trumpSuit && trumpLen > 0 && voidCount > 0) {
    // Ruffing potential: each void with trump left is a likely trick.
    estimate += Math.min(trumpLen, voidCount) * params.voidBonus
  }
  if (trumpLen >= 3) {
    estimate += (trumpLen - 2) * params.longSuitPerCard
  }

  // Multi-player dilution: winners are contested more at larger tables.
  const dilution = 1 - Math.max(0, seatCount - 3) * 0.04
  estimate *= dilution

  return Math.max(0, Math.min(cards, estimate))
}

function nearestLegalBid(legal: number[], target: number) {
  return legal.reduce((best, bid) =>
    Math.abs(bid - target) < Math.abs(best - target) ? bid : best
  )
}

export function heuristicBid(
  state: GameState,
  seat: number,
  params: BotParams = DEFAULT_BOT_PARAMS
) {
  const hand = state.hands[seat]
  let estimate = estimateTricks(
    hand,
    state.trump,
    params,
    state.settings.seatCount
  )

  const placed = state.bids.filter((bid): bid is number => bid !== null)
  const cards = cardsThisRound(state)
  if (placed.length > 0) {
    const totalBid = placed.reduce((sum, bid) => sum + bid, 0)
    const expectedTotal = cards * 0.92
    // If the table is overbidding, shade down (harder to win tricks).
    if (totalBid > expectedTotal) {
      estimate *= 0.9
    } else if (totalBid < expectedTotal * 0.55) {
      estimate *= 1.05
    }
  }

  const legal = legalBids(state, seat)
  if (legal.length === 0) throw new Error("Bot has no legal bids")

  let target = Math.round(estimate * (1 - params.bidConservatism * 0.65))
  // Prefer underbidding slightly — making a low bid scores; missing a high bid is costly.
  if (estimate - Math.floor(estimate) < 0.42 && target > 0) {
    target = Math.min(target, Math.floor(estimate))
  }
  target = Math.max(0, Math.min(cards, target))

  const forbidden = forbiddenDealerBid(state)
  if (forbidden !== null && seat === state.dealer) {
    const lower = legal.filter((bid) => bid < forbidden)
    const higher = legal.filter((bid) => bid > forbidden)
    if (target === forbidden || !legal.includes(target)) {
      if (lower.length > 0 && higher.length > 0) {
        // Prefer the side closer to estimate; break ties toward underbid.
        const down = Math.max(...lower)
        const up = Math.min(...higher)
        target =
          Math.abs(estimate - down) <= Math.abs(estimate - up) ? down : up
      } else {
        target = nearestLegalBid(legal, estimate)
      }
    }
  }

  return legal.includes(target) ? target : nearestLegalBid(legal, target)
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
  const need = bid - tricksWon
  return {
    bid,
    tricksWon,
    need,
    cardsLeft,
    overBy: tricksWon - bid,
    mustWinAll: need >= cardsLeft,
    mustLoseAll: need <= 0 && cardsLeft > 0,
    tight: Math.abs(need) <= 1,
  }
}

function opponentsNeeding(state: GameState, seat: number) {
  return state.seats
    .map((_, index) => index)
    .filter((index) => index !== seat)
    .map((index) => ({
      seat: index,
      need: (state.bids[index] ?? 0) - state.tricks[index],
      left: state.hands[index].length,
    }))
}

function scoreFollowPlay(
  card: Card,
  state: GameState,
  seat: number,
  params: BotParams
) {
  const { need, cardsLeft, mustWinAll, mustLoseAll, overBy } = playNeed(
    state,
    seat
  )
  const wins = wouldWinTrick(state.currentTrick, state.trump, seat, card)
  const rank = rankValue(card.rank)
  const isTrump = state.trump !== null && card.suit === state.trump.suit
  const lastToPlay =
    state.currentTrick.length === state.settings.seatCount - 1
  let score = 0

  if (mustWinAll) return wins ? 5000 - rank * params.winWithLowRank : -5000
  if (mustLoseAll) {
    return wins ? -5000 : 5000 + rank * params.loseWithHighRank
  }

  if (need > 0) {
    if (wins) {
      score += 200 - rank * params.winWithLowRank
      // Prefer winning on the last seat — less chance of being overtaken.
      if (lastToPlay) score += 35
      else score -= 8
    } else {
      score -= 150 + rank
      // If we can't win, dump junk and save winners.
      score += (14 - rank) * 2
    }
  } else {
    if (wins) {
      score -= 220 + rank * params.loseWithHighRank
      // Already overbid: avoid taking more at all costs.
      if (overBy >= 0) score -= 80
    } else {
      score += 160 + rank * params.loseWithHighRank
    }
  }

  if (isTrump && need <= 0) score -= params.trumpOnlyWhenNeed * 55
  if (isTrump && need > 0 && wins) {
    // Win with cheapest trump available.
    score -= rank * 0.35
  }

  const led = state.currentTrick[0]?.card
  if (led && card.suit !== led.suit && !wins && need > 0) score -= 40

  // Avoid gifting a trick to an opponent who still needs exactly one.
  if (!wins && lastToPlay) {
    const winner = trickWinner(state.currentTrick, state.trump)
    const theirNeed = (state.bids[winner] ?? 0) - state.tricks[winner]
    if (theirNeed === 0) score += 25 // they're about to bag — good if we duck
    if (theirNeed === 1 && need <= 0) score -= 15
  }

  if (cardsLeft === 1 && need === 1 && wins) score += 400
  if (cardsLeft === 1 && need === 0 && !wins) score += 400

  return score
}

function scoreLeadPlay(
  card: Card,
  state: GameState,
  seat: number,
  params: BotParams
) {
  const { need, cardsLeft, mustWinAll, mustLoseAll } = playNeed(state, seat)
  const rank = rankValue(card.rank)
  const isTrump = state.trump !== null && card.suit === state.trump.suit
  const hand = state.hands[seat]
  const suitLen = hand.filter((item) => item.suit === card.suit).length
  const opponents = opponentsNeeding(state, seat)
  let score = 0

  if (mustWinAll) {
    score += rank * params.leadWinnerRank * 2
    if (isTrump) score += 20
    if (suitLen >= 3) score += params.longSuitPerCard * 50
    return score
  }
  if (mustLoseAll) {
    score -= rank * params.leadLoserRank * 2
    if (suitLen === 1) score += 40
    if (isTrump) score -= 60
    return score
  }

  if (need > 0) {
    score += rank * params.leadWinnerRank
    if (suitLen >= 3) score += params.longSuitPerCard * 40
    // Lead trump when we need tricks and hold length.
    if (isTrump && suitLen >= 2) score += 25
    else if (isTrump) score -= 10
    // Ace leads in offsuit are strong.
    if (!isTrump && rank >= 14) score += 30
  } else {
    score -= rank * params.leadLoserRank
    if (suitLen === 1) score += 35
    if (suitLen >= 4) score -= 25
    if (isTrump) score -= 70
    if (rank >= 14) score -= 40
  }

  // Exit into suits where someone is desperate for a bag.
  const hungry = opponents.some((opp) => opp.need > 0 && opp.left > 0)
  if (need <= 0 && hungry && rank <= 9) score += 12

  if (cardsLeft <= 2 && need > 0) score += rank * 0.8
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

export function heuristicPlay(
  state: GameState,
  seat: number,
  params: BotParams = DEFAULT_BOT_PARAMS
) {
  const hand = state.hands[seat]
  const legal = hand.filter((card) => wouldBeLegalPlay(state, seat, card))
  if (legal.length === 0) throw new Error("Bot has no legal play")

  if (state.currentTrick.length === 0) {
    const pool = leadPool(legal, state)
    return [...pool].sort(
      (a, b) =>
        scoreLeadPlay(b, state, seat, params) -
        scoreLeadPlay(a, state, seat, params)
    )[0]
  }

  const { mustWinAll, mustLoseAll, need, cardsLeft } = playNeed(state, seat)
  const winning = legal.filter((card) =>
    wouldWinTrick(state.currentTrick, state.trump, seat, card)
  )
  const losing = legal.filter(
    (card) => !wouldWinTrick(state.currentTrick, state.trump, seat, card)
  )

  if (mustWinAll && winning.length > 0) return lowestCard(winning)
  if (mustLoseAll && losing.length > 0) {
    // Dump highest loser; if forced to win, win as cheaply as possible.
    return highestCard(losing)
  }

  // Late-trick precision: if we need exactly one more and can win cheaply, do it.
  if (need === 1 && cardsLeft <= 3 && winning.length > 0) {
    return lowestCard(winning)
  }
  if (need <= 0 && losing.length > 0) {
    return highestCard(losing)
  }

  return [...legal].sort(
    (a, b) =>
      scoreFollowPlay(b, state, seat, params) -
      scoreFollowPlay(a, state, seat, params)
  )[0]
}

export function makeHeuristicBot(params: BotParams = DEFAULT_BOT_PARAMS): BotBrain {
  return {
    chooseBid: (state, seat) => heuristicBid(state, seat, params),
    choosePlay: (state, seat) => heuristicPlay(state, seat, params),
  }
}
