"use client"

import { useEffect } from "react"
import {
  chooseBid,
  choosePlay,
  isBotSeat,
  shouldRunBotController,
} from "@/lib/game/bots"
import {
  placeBid,
  playCard,
} from "@/lib/game/engine"
import type { GameState } from "@/lib/game/types"

export function useBotController(
  state: GameState | undefined,
  version: number | undefined,
  mySeatIndex: number | null,
  apply: (mutate: (current: GameState) => GameState) => Promise<unknown>,
  opts?: { playerId?: string; onlineIds?: string[] }
) {
  const playerId = opts?.playerId
  const onlineIds = opts?.onlineIds

  useEffect(() => {
    if (!state || version === undefined) return
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
            await apply((current) =>
              placeBid(current, seat, chooseBid(current, seat))
            )
            return
          }
          if (state.phase === "playing") {
            await apply((current) =>
              playCard(current, seat, choosePlay(current, seat))
            )
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
    onlineIds,
    playerId,
    state?.currentSeat,
    state?.phase,
    version,
    state,
  ])
}
