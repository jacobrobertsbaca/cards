"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

const TOAST_ID = "join-table"

export function useJoinPrompt({
  active,
  taken,
  seats,
  open,
  onJoin,
  onSpectate,
}: {
  active: boolean
  taken: number
  seats: number
  open: boolean
  onJoin: () => void
  onSpectate: () => void
}) {
  const onJoinRef = useRef(onJoin)
  const onSpectateRef = useRef(onSpectate)
  onJoinRef.current = onJoin
  onSpectateRef.current = onSpectate

  useEffect(() => {
    if (!active) {
      toast.dismiss(TOAST_ID)
      return
    }

    // Sonner ignores cancel.onClick when dismissible is false, so Spectate
    // must be a real button element (or the primary action) to work.
    toast(`${taken}/${seats} joined`, {
      id: TOAST_ID,
      duration: Infinity,
      dismissible: false,
      closeButton: false,
      action: open
        ? {
            label: "Join",
            onClick: (event) => {
              event.preventDefault()
              onJoinRef.current()
            },
          }
        : {
            label: "Spectate",
            onClick: (event) => {
              event.preventDefault()
              onSpectateRef.current()
            },
          },
      cancel: open ? (
        <button
          type="button"
          data-button="true"
          data-cancel="true"
          onClick={() => onSpectateRef.current()}
        >
          Spectate
        </button>
      ) : undefined,
    })

    return () => {
      toast.dismiss(TOAST_ID)
    }
  }, [active, open, seats, taken])
}
