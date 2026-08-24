import type { Card, GameState, Seat } from "../types"
import { legalBids, wouldBeLegalPlay } from "../engine"
import { TRAINED_BOT_PARAMS, type BotParams } from "./params"
import { makeHeuristicBot, heuristicPlay } from "./policy"
import { searchBid, searchPlay } from "./search"

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

/** Heuristic-only bot (rollouts / training). */
export function createParamBot(params: BotParams) {
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

export function chooseBid(state: GameState, seat: number) {
  const bid = searchBid(state, seat, ACTIVE_PARAMS)
  const legal = legalBids(state, seat)
  if (!legal.includes(bid)) {
    throw new Error(`Bot produced illegal bid ${bid}`)
  }
  return bid
}

export function choosePlay(state: GameState, seat: number) {
  const card = needsDeepPlaySearch(state, seat)
    ? searchPlay(state, seat, ACTIVE_PARAMS)
    : heuristicPlay(state, seat, ACTIVE_PARAMS)

  if (!wouldBeLegalPlay(state, seat, card)) {
    throw new Error("Bot produced illegal play")
  }
  return card
}

export function createStrongBot(params: BotParams = ACTIVE_PARAMS) {
  return {
    chooseBid: (state: GameState, seat: number) => searchBid(state, seat, params),
    choosePlay: (state: GameState, seat: number) => {
      if (needsDeepPlaySearch(state, seat)) {
        return searchPlay(state, seat, params)
      }
      return heuristicPlay(state, seat, params)
    },
  }
}

export type { BotParams }
export type { BotBrain } from "./policy"
export type { Card, GameState }
