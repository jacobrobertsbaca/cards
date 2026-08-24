"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { ranking } from "@/lib/game/engine"
import type { GameState } from "@/lib/game/types"

const TOAST_ID = "game-completed"

export function useGameOverPrompt({
  active,
  state,
}: {
  active: boolean
  state: GameState
}) {
  const dismissed = useRef(false)
  const standings = ranking(state)
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

    toast("Game completed", {
      id: TOAST_ID,
      duration: Infinity,
      dismissible: true,
      closeButton: true,
      description: (
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
      ),
      onDismiss: () => {
        dismissed.current = true
      },
    })

    return () => {
      toast.dismiss(TOAST_ID)
    }
  }, [active, signature])
}
