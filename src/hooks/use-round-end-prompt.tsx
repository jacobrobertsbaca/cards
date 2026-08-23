"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

const TOAST_ID = "round-completed"

export type RoundEndRow = {
  seat: number
  name: string
  score: number
}

export function useRoundEndPrompt({
  active,
  rows,
  onContinue,
}: {
  active: boolean
  rows: RoundEndRow[]
  onContinue: () => void
}) {
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue
  const signature = rows
    .map((row) => `${row.seat}:${row.name}:${row.score}`)
    .join("|")

  useEffect(() => {
    if (!active) {
      toast.dismiss(TOAST_ID)
      return
    }

    toast("Round completed", {
      id: TOAST_ID,
      duration: Infinity,
      dismissible: false,
      closeButton: false,
      description: (
        <div className="space-y-0.5">
          {rows.map((row) => (
            <div key={row.seat} className="flex justify-between gap-4">
              <span>{row.name}</span>
              <span className="font-mono">
                {row.score > 0 ? `+${row.score}` : `${row.score}`}
              </span>
            </div>
          ))}
        </div>
      ),
    })

    const go = () => onContinueRef.current()
    window.addEventListener("pointerdown", go)
    return () => {
      window.removeEventListener("pointerdown", go)
      toast.dismiss(TOAST_ID)
    }
    // rows are represented by signature so the toast is not recreated every render
  }, [active, signature])
}
