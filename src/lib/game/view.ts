import type { Card, GameState, Suit } from "@/lib/game/types"
import { isBridge, isOhHell } from "@/lib/game/types"
import { cardsThisRound as ohHellCardsThisRound } from "@/lib/oh-hell/engine"
import type { BridgeState } from "@/lib/bridge/types"

export function dealIndexOf(state: GameState): number {
  return isBridge(state) ? state.dealIndex : state.roundIndex
}

export function cardsDealtThisRound(state: GameState): number {
  if (isBridge(state)) return 13
  return ohHellCardsThisRound(state)
}

/** Trump as a card for Oh Hell flip UX; bridge has no flipped trump card. */
export function flippedTrump(state: GameState): Card | null {
  return isOhHell(state) ? state.trump : null
}

export function trumpSuitOf(state: GameState): Suit | null {
  if (isBridge(state)) return state.trumpSuit
  return state.trump?.suit ?? null
}

/** Argument for shared trickWinner helper (Card | null). */
export function trumpForTrickWinner(state: GameState): Card | null {
  if (isOhHell(state)) return state.trump
  if (state.trumpSuit) return { suit: state.trumpSuit, rank: "A" }
  return null
}

export function isDummyRevealed(state: BridgeState): boolean {
  return Boolean(state.contract && state.openingLeadDone)
}

export function canControlSeat(
  state: GameState,
  controller: number | null,
  seatIndex: number
): boolean {
  if (controller === null) return false
  if (!isBridge(state) || !state.contract) {
    return controller === seatIndex
  }
  // Once dummy is exposed, declarer alone controls that hand.
  if (state.openingLeadDone && seatIndex === state.contract.dummy) {
    return controller === state.contract.declarer
  }
  return controller === seatIndex
}
