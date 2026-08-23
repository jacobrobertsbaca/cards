"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

const TOAST_ID = "continue-trick"

export function useContinuePrompt(active: boolean, onContinue: () => void) {
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue

  useEffect(() => {
    if (!active) {
      toast.dismiss(TOAST_ID)
      return
    }

    toast("Tap anywhere to continue", {
      id: TOAST_ID,
      duration: Infinity,
      dismissible: false,
      closeButton: false,
    })

    const go = () => onContinueRef.current()
    window.addEventListener("pointerdown", go)
    return () => {
      window.removeEventListener("pointerdown", go)
      toast.dismiss(TOAST_ID)
    }
  }, [active])
}
