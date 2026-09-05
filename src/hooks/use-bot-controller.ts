"use client"

import { useEffect } from "react"
import { shouldRunBotController } from "@/lib/oh-hell/bots"
import {
  applyScheduledBotTurn,
  isBotTurn,
} from "@/lib/game/bot-turn"
import type { BridgeCall } from "@/lib/bridge/types"
import type { GameState, Seat } from "@/lib/game/types"
import { isBridge, isOhHell } from "@/lib/game/types"

export function useBotController(
  state: GameState | undefined,
  version: number | undefined,
  mySeatIndex: number | null,
  apply: (mutate: (current: GameState) => GameState) => Promise<unknown>,
  opts?: {
    playerId?: string
    onlineIds?: string[]
    onBridgeCall?: (seat: Seat, call: BridgeCall, auction: BridgeCall[]) => void
    onOhHellBid?: (seat: Seat, bid: number) => void
  }
) {
  const playerId = opts?.playerId
  const onlineIds = opts?.onlineIds
  const onBridgeCall = opts?.onBridgeCall
  const onOhHellBid = opts?.onOhHellBid

  useEffect(() => {
    if (!state || version === undefined) return
    if (!isBridge(state) && !isOhHell(state)) return
    if (
      !shouldRunBotController(state, mySeatIndex, { playerId, onlineIds })
    ) {
      return
    }

    const expectedSeat = state.currentSeat
    if (expectedSeat === null) return
    if (!isBotTurn(state)) return

    const timer = window.setTimeout(() => {
      void (async () => {
        const placed: {
          bridgeCall: {
            seat: Seat
            call: BridgeCall
            auction: BridgeCall[]
          } | null
          ohHellBid: { seat: Seat; bid: number } | null
        } = { bridgeCall: null, ohHellBid: null }
        try {
          await apply((current) => {
            placed.bridgeCall = null
            placed.ohHellBid = null
            const result = applyScheduledBotTurn(current, expectedSeat)
            if (result.bridgeCall) placed.bridgeCall = result.bridgeCall
            if (result.ohHellBid) placed.ohHellBid = result.ohHellBid
            return result.state
          })
          if (placed.bridgeCall) {
            onBridgeCall?.(
              placed.bridgeCall.seat,
              placed.bridgeCall.call,
              placed.bridgeCall.auction
            )
          }
          if (placed.ohHellBid) {
            onOhHellBid?.(placed.ohHellBid.seat, placed.ohHellBid.bid)
          }
        } catch {
          // Ignore races when another client already advanced the turn.
        }
      })()
    }, 700)

    return () => window.clearTimeout(timer)
  }, [
    apply,
    mySeatIndex,
    onBridgeCall,
    onOhHellBid,
    onlineIds,
    playerId,
    state?.currentSeat,
    state?.phase,
    version,
    state,
  ])
}
