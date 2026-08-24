"use client"

import { createContext, useContext, useRef, useState, type ReactNode } from "react"

export type PlayOrigin = {
  x: number
  y: number
  scale: number
  tilt: string
}

type PlayOriginApi = {
  set: (seat: number, origin: PlayOrigin) => void
  take: (seat: number) => PlayOrigin | null
}

const PlayOriginContext = createContext<PlayOriginApi | null>(null)

export function PlayOriginProvider({ children }: { children: ReactNode }) {
  const origins = useRef(new Map<number, PlayOrigin>())
  const [api] = useState<PlayOriginApi>(() => ({
    set: (seat, origin) => {
      origins.current.set(seat, origin)
    },
    take: (seat) => {
      const origin = origins.current.get(seat) ?? null
      origins.current.delete(seat)
      return origin
    },
  }))

  return (
    <PlayOriginContext.Provider value={api}>
      {children}
    </PlayOriginContext.Provider>
  )
}

export function usePlayOrigin() {
  return useContext(PlayOriginContext)
}

export function originFromElement(el: Element, felt: Element): PlayOrigin {
  const home = el.getBoundingClientRect()
  const area = felt.getBoundingClientRect()
  return {
    x: home.left + home.width / 2 - (area.left + area.width / 2),
    y: home.top + home.height / 2 - (area.top + area.height / 2),
    scale: home.width / 85.6,
    tilt: "0deg",
  }
}
