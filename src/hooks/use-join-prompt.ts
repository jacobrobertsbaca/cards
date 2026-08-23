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
            onClick: () => onSpectateRef.current(),
          },
      cancel: open
        ? {
            label: "Spectate",
            onClick: () => onSpectateRef.current(),
          }
        : undefined,
    })

    return () => {
      toast.dismiss(TOAST_ID)
    }
  }, [active, open, seats, taken])
}
