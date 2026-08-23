"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { GameState } from "@/lib/game/types"
import { getGameStore, VersionConflictError, type GameRecord } from "@/lib/store"
import { useIdentity } from "./use-identity"

export function useGame(code: string) {
  const identity = useIdentity()
  const [record, setRecord] = useState<GameRecord | null>(null)
  const [status, setStatus] = useState<"loading" | "missing" | "ready" | "error">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState<string[]>([])
  const recordRef = useRef(record)

  useEffect(() => {
    recordRef.current = record
  }, [record])

  useEffect(() => {
    if (!identity.id) return
    const store = getGameStore()
    let cancelled = false
    let unsub = () => {}
    let unpres = () => {}

    void (async () => {
      try {
        const found = await store.get(code)
        if (cancelled) return
        if (!found) {
          setStatus("missing")
          return
        }
        setRecord(found)
        setStatus("ready")
        unsub = store.subscribe(code, (next) => {
          setRecord(next)
        })
        unpres = store.trackPresence(code, identity.id, setOnline)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Could not load game")
        setStatus("error")
      }
    })()

    return () => {
      cancelled = true
      unsub()
      unpres()
    }
  }, [code, identity.id])

  const apply = useCallback(
    async (mutate: (state: GameState) => GameState) => {
      const store = getGameStore()
      for (let attempt = 0; attempt < 5; attempt++) {
        const current = recordRef.current
        if (!current) throw new Error("Game is not ready")
        try {
          const nextState = mutate(current.state)
          if (nextState === current.state) return current
          const next = await store.save(code, nextState, current.version)
          setRecord(next)
          setError(null)
          return next
        } catch (err) {
          if (err instanceof VersionConflictError) {
            const fresh = await store.get(code)
            if (fresh) setRecord(fresh)
            continue
          }
          const message = err instanceof Error ? err.message : "Move failed"
          setError(message)
          throw err
        }
      }
      throw new Error("The table changed too quickly. Try again.")
    },
    [code]
  )

  return { record, status, error, online, apply, identity }
}
