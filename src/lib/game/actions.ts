import type { Card, GameSettings, GameState } from "@/lib/game/types"
import { isBridge, isOhHell } from "@/lib/game/types"
import * as ohHell from "@/lib/oh-hell/engine"
import * as bridge from "@/lib/bridge/engine"
import type { BridgeCall } from "@/lib/bridge/types"
import type { OhHellSettings } from "@/lib/oh-hell/types"
import type { BridgeSettings } from "@/lib/bridge/types"

export class GameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GameError"
  }
}

function wrapBridge<T>(fn: () => T): T {
  try {
    return fn()
  } catch (err) {
    if (err instanceof bridge.BridgeError) throw new GameError(err.message)
    throw err
  }
}

export function createGame(settings: GameSettings): GameState {
  if (settings.kind === "bridge") {
    return wrapBridge(() => bridge.createBridgeGame(settings))
  }
  return ohHell.createGame(settings)
}

export function joinGame(
  state: GameState,
  playerId: string,
  displayName: string
): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.joinBridgeGame(state, playerId, displayName))
  }
  return ohHell.joinGame(state, playerId, displayName)
}

export function makeBot(state: GameState, seatIndex: number): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.makeBridgeBot(state, seatIndex))
  }
  return ohHell.makeBot(state, seatIndex)
}

export function removeBot(state: GameState, seatIndex: number): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.removeBridgeBot(state, seatIndex))
  }
  return ohHell.removeBot(state, seatIndex)
}

export function leaveGame(state: GameState, playerId: string): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.leaveBridgeGame(state, playerId))
  }
  return ohHell.leaveGame(state, playerId)
}

export function swapSeats(
  state: GameState,
  playerId: string,
  targetSeatIndex: number
): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.swapBridgeSeats(state, playerId, targetSeatIndex))
  }
  return ohHell.swapSeats(state, playerId, targetSeatIndex)
}

export function startGame(state: GameState): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.startBridgeGame(state))
  }
  return ohHell.startGame(state)
}

export function renameSeat(
  state: GameState,
  playerId: string,
  displayName: string
): GameState {
  if (isBridge(state)) {
    return bridge.renameBridgeSeat(state, playerId, displayName)
  }
  return ohHell.renameSeat(state, playerId, displayName)
}

export function renameGame(state: GameState, title: string): GameState {
  if (isBridge(state)) {
    return bridge.renameBridgeGame(state, title)
  }
  return ohHell.renameGame(state, title)
}

export function updateSettings(
  state: GameState,
  settings: GameSettings
): GameState {
  if (isBridge(state)) {
    if (settings.kind !== "bridge") {
      throw new GameError("Cannot change game type after creation")
    }
    return wrapBridge(() =>
      bridge.updateBridgeSettings(state, settings as BridgeSettings)
    )
  }
  if (settings.kind !== "oh-hell") {
    throw new GameError("Cannot change game type after creation")
  }
  return ohHell.updateSettings(state, settings as OhHellSettings)
}

export function placeBid(state: GameState, seat: number, bid: number): GameState {
  if (!isOhHell(state)) throw new GameError("Bidding is closed")
  return ohHell.placeBid(state, seat, bid)
}

export function placeCall(
  state: GameState,
  seat: number,
  call: BridgeCall
): GameState {
  if (!isBridge(state)) throw new GameError("Bidding is closed")
  return wrapBridge(() => bridge.placeBridgeCall(state, seat, call))
}

export function isLegalPlay(state: GameState, seat: number, card: Card): boolean {
  if (isBridge(state)) return bridge.isLegalBridgePlay(state, seat, card)
  return ohHell.isLegalPlay(state, seat, card)
}

export function wouldBeLegalPlay(
  state: GameState,
  seat: number,
  card: Card
): boolean {
  if (isBridge(state)) return bridge.wouldBeLegalBridgePlay(state, seat, card)
  return ohHell.wouldBeLegalPlay(state, seat, card)
}

export function playCard(state: GameState, seat: number, card: Card): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.playBridgeCard(state, seat, card))
  }
  return ohHell.playCard(state, seat, card)
}

export function continueTrick(state: GameState): GameState {
  if (isBridge(state)) return bridge.continueBridgeTrick(state)
  return ohHell.continueTrick(state)
}

export function startRound(state: GameState): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.startBridgeDeal(state))
  }
  return ohHell.startRound(state)
}

export function seatForPlayer(state: GameState, playerId: string) {
  if (isBridge(state)) return bridge.seatForBridgePlayer(state, playerId)
  return ohHell.seatForPlayer(state, playerId)
}

export function createRematch(state: GameState): GameState {
  if (isBridge(state)) return bridge.createBridgeRematch(state)
  return ohHell.createRematch(state)
}

export function beginRematch(state: GameState, code: string): GameState {
  if (isBridge(state)) {
    return wrapBridge(() => bridge.beginBridgeRematch(state, code))
  }
  return ohHell.beginRematch(state, code)
}

export function filledSeats(state: GameState) {
  if (isBridge(state)) return bridge.filledBridgeSeats(state)
  return ohHell.filledSeats(state)
}

export function trickWinner(
  trick: Parameters<typeof ohHell.trickWinner>[0],
  trump: Parameters<typeof ohHell.trickWinner>[1]
) {
  return ohHell.trickWinner(trick, trump)
}

export function ranking(state: GameState) {
  if (!isOhHell(state)) {
    return state.seats.map((seat, index) => ({
      seat: seat.index,
      name: seat.displayName ?? `Player ${seat.index + 1}`,
      score: 0,
    }))
  }
  return ohHell.ranking(state)
}

// Oh Hell–specific helpers re-exported for UI that already narrowed kind
export {
  cardsThisRound,
  legalBids,
  forbiddenDealerBid,
} from "@/lib/oh-hell/engine"
