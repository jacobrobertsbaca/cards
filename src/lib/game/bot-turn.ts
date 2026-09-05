import {
  chooseBridgeCall,
  chooseBridgePlay,
  isBridgeBotSeat,
} from "@/lib/bridge/bots"
import type { BridgeCall } from "@/lib/bridge/types"
import type { BridgeState } from "@/lib/bridge/types"
import {
  chooseBid,
  choosePlay,
  isBotSeat,
} from "@/lib/oh-hell/bots"
import {
  placeBid,
  placeCall,
  playCard,
} from "@/lib/game/actions"
import type { GameState, Seat } from "@/lib/game/types"
import { isBridge, isOhHell } from "@/lib/game/types"

export type BotTurnResult =
  | {
      state: GameState
      bridgeCall: { seat: Seat; call: BridgeCall; auction: BridgeCall[] }
      ohHellBid?: undefined
    }
  | {
      state: GameState
      ohHellBid: { seat: Seat; bid: number }
      bridgeCall?: undefined
    }
  | {
      state: GameState
      bridgeCall?: undefined
      ohHellBid?: undefined
    }

function bridgeActor(state: BridgeState): number | null {
  const seat = state.currentSeat
  if (seat === null) return null
  if (
    state.phase === "playing" &&
    state.contract &&
    state.openingLeadDone &&
    seat === state.contract.dummy
  ) {
    return state.contract.declarer
  }
  return seat
}

/**
 * Apply at most the seat that was current when the bot timer was scheduled.
 * Returns the unchanged state when that seat's turn has already passed — so
 * version-conflict retries cannot place a call/bid for a later player.
 */
export function applyScheduledBotTurn(
  current: GameState,
  expectedSeat: number
): BotTurnResult {
  if (isBridge(current)) {
    if (current.currentSeat !== expectedSeat) return { state: current }

    const actor = bridgeActor(current)
    if (actor === null) return { state: current }
    if (!isBridgeBotSeat(current.seats[actor])) return { state: current }

    if (current.phase === "bidding") {
      const auction = current.auction
      const call = chooseBridgeCall(current, actor)
      return {
        state: placeCall(current, actor, call),
        bridgeCall: {
          seat: current.seats[actor],
          call,
          auction,
        },
      }
    }

    if (current.phase === "playing") {
      return {
        state: playCard(current, actor, chooseBridgePlay(current, actor)),
      }
    }

    return { state: current }
  }

  if (!isOhHell(current)) return { state: current }
  if (current.currentSeat !== expectedSeat) return { state: current }
  if (!isBotSeat(current.seats[expectedSeat])) return { state: current }

  if (current.phase === "bidding") {
    const bid = chooseBid(current, expectedSeat)
    return {
      state: placeBid(current, expectedSeat, bid),
      ohHellBid: {
        seat: current.seats[expectedSeat],
        bid,
      },
    }
  }

  if (current.phase === "playing") {
    return {
      state: playCard(
        current,
        expectedSeat,
        choosePlay(current, expectedSeat)
      ),
    }
  }

  return { state: current }
}

/** True when the current turn should be driven by a bot for this snapshot. */
export function isBotTurn(state: GameState): boolean {
  if (state.currentSeat === null) return false
  if (isBridge(state)) {
    const actor = bridgeActor(state)
    return actor !== null && isBridgeBotSeat(state.seats[actor])
  }
  if (isOhHell(state)) {
    return isBotSeat(state.seats[state.currentSeat])
  }
  return false
}
