"use client"

import { useEffect, useState } from "react"

export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const hover = window.matchMedia("(hover: none)")
    const pointer = window.matchMedia("(pointer: coarse)")
    const sync = () => setCoarse(hover.matches || pointer.matches)
    sync()
    hover.addEventListener("change", sync)
    pointer.addEventListener("change", sync)
    return () => {
      hover.removeEventListener("change", sync)
      pointer.removeEventListener("change", sync)
    }
  }, [])

  return coarse
}
