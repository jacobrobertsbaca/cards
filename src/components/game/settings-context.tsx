"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type GameSettingsApi = {
  open: () => void
} | null

type GameSettingsContextValue = {
  api: GameSettingsApi
  setApi: (api: GameSettingsApi) => void
}

const GameSettingsContext = createContext<GameSettingsContextValue | null>(null)

export function GameSettingsProvider({ children }: { children: ReactNode }) {
  const [api, setApiState] = useState<GameSettingsApi>(null)
  const setApi = useCallback((next: GameSettingsApi) => {
    setApiState(next)
  }, [])
  const value = useMemo(() => ({ api, setApi }), [api, setApi])

  return (
    <GameSettingsContext.Provider value={value}>
      {children}
    </GameSettingsContext.Provider>
  )
}

export function useGameSettingsApi() {
  const ctx = useContext(GameSettingsContext)
  return ctx?.api ?? null
}

export function useRegisterGameSettings(open: (() => void) | null) {
  const ctx = useContext(GameSettingsContext)
  const setApi = ctx?.setApi

  useEffect(() => {
    if (!setApi) return
    if (open) setApi({ open })
    else setApi(null)
    return () => setApi(null)
  }, [open, setApi])
}
