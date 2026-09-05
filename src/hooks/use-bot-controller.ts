"use client"

import { useEffect } from "react"
import {
  chooseBid,
  choosePlay,
  isBotSeat,
  shouldRunBotController,
} from "@/lib/oh-hell/bots"
import {
  chooseBridgeCall,
  chooseBridgePlay,
  isBridgeBotSeat,
} from "@/lib/bridge/bots"
import {
  placeBid,
  placeCall,
  playCard,
} from "@/lib/game/actions"
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

    if (isBridge(state)) {
      if (
        !shouldRunBotController(state, mySeatIndex, { playerId, onlineIds })
      ) {
        return
      }
      const seat = state.currentSeat
      if (seat === null) return

      // Declarer (not dummy) plays from dummy after the opening lead.
      const actor =
        state.phase === "playing" &&
        state.contract &&
        state.openingLeadDone &&
        seat === state.contract.dummy
          ? state.contract.declarer
          : seat

      if (!isBridgeBotSeat(state.seats[actor])) return

      const timer = window.setTimeout(() => {
        void (async () => {
          try {
            if (state.phase === "bidding") {
              const auction = state.auction
              const call = chooseBridgeCall(state, actor)
              await apply((current) => {
                if (!isBridge(current)) return current
                return placeCall(current, actor, call)
              })
              const botSeat = state.seats[actor]
              if (botSeat) onBridgeCall?.(botSeat, call, auction)
              return
            }
            if (state.phase === "playing") {
              await apply((current) => {
                if (!isBridge(current)) return current
                return playCard(
                  current,
                  actor,
                  chooseBridgePlay(current, actor)
                )
              })
            }
          } catch {
            // Ignore races
          }
        })()
      }, 700)
      return () => window.clearTimeout(timer)
    }

    if (!isOhHell(state)) return
    if (
      !shouldRunBotController(state, mySeatIndex, { playerId, onlineIds })
    ) {
      return
    }

    const seat = state.currentSeat
    if (seat === null) return
    if (!isBotSeat(state.seats[seat])) return

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (state.phase === "bidding") {
            const bid = chooseBid(state, seat)
            await apply((current) => {
              if (!isOhHell(current)) return current
              return placeBid(current, seat, bid)
            })
            const botSeat = state.seats[seat]
            if (botSeat) onOhHellBid?.(botSeat, bid)
            return
          }
          if (state.phase === "playing") {
            await apply((current) => {
              if (!isOhHell(current)) return current
              return playCard(current, seat, choosePlay(current, seat))
            })
          }
        } catch {
          // Ignore races when multiple clients apply the same bot move.
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
