"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { ranking } from "@/lib/game/actions"
import type { GameState } from "@/lib/game/types"
import { isBridge, isOhHell } from "@/lib/game/types"
import { playFromHistory, rubberWinners, sidePoints } from "@/lib/bridge/scoring"

const TOAST_ID = "game-over"

export function useGameOverPrompt({
  active,
  state,
  onRematch,
}: {
  active: boolean
  state: GameState
  onRematch: () => void | Promise<void>
}) {
  const dismissed = useRef(false)
  const onRematchRef = useRef(onRematch)
  onRematchRef.current = onRematch

  const standings = (() => {
    if (isOhHell(state)) return ranking(state)
    if (isBridge(state)) {
      const play = playFromHistory(state.history)
      return [
        { seat: 0, name: "NS", score: sidePoints(play, "NS") },
        { seat: 1, name: "EW", score: sidePoints(play, "EW") },
      ]
    }
    return []
  })()
  const signature = standings
    .map((row) => `${row.seat}:${row.name}:${row.score}`)
    .join("|")

  useEffect(() => {
    if (!active) {
      dismissed.current = false
      toast.dismiss(TOAST_ID)
      return
    }
    if (dismissed.current) return

    const title =
      isBridge(state) && rubberWinners(playFromHistory(state.history)).length === 1
        ? `${rubberWinners(playFromHistory(state.history))[0]} wins the rubber!`
        : "Game over!"

    toast(title, {
      id: TOAST_ID,
      duration: Infinity,
      dismissible: true,
      closeButton: true,
      description: (
        <div className="space-y-2">
          <div className="space-y-0.5">
            {standings.map((row, index) => (
              <div key={row.seat} className="flex justify-between gap-4">
                <span>
                  {index + 1}. {row.name}
                </span>
                <span className="font-mono">{row.score}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-button
            className="rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background"
            onClick={() => {
              void onRematchRef.current()
            }}
          >
            Rematch
          </button>
        </div>
      ),
      onDismiss: () => {
        dismissed.current = true
      },
    })

    return () => {
      toast.dismiss(TOAST_ID)
    }
  }, [active, signature, state])
}
