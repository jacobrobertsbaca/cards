"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EMOTE_DURATION_MS, isTableEmote, type TableEmote } from "@/lib/emotes"
import type { GameState } from "@/lib/game/types"
import {
  getGameStore,
  VersionConflictError,
  type EmoteEvent,
  type GameRecord,
} from "@/lib/store"
import { useIdentity } from "./use-identity"

export function useGame(code: string) {
  const identity = useIdentity()
  const [record, setRecord] = useState<GameRecord | null>(null)
  const [status, setStatus] = useState<"loading" | "missing" | "ready" | "error">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState<string[]>([])
  const [emotes, setEmotes] = useState<EmoteEvent[]>([])
  const recordRef = useRef(record)
  recordRef.current = record
  const sendEmoteRef = useRef<(event: EmoteEvent) => void>(() => {})
  const emoteTimers = useRef(new Map<string, number>())
  const seenEmotes = useRef(new Set<string>())

  const clearEmote = useCallback((id: string) => {
    const timer = emoteTimers.current.get(id)
    if (timer) window.clearTimeout(timer)
    emoteTimers.current.delete(id)
    seenEmotes.current.delete(id)
    setEmotes((current) => current.filter((item) => item.id !== id))
  }, [])

  const showEmote = useCallback(
    (event: EmoteEvent) => {
      if (!isTableEmote(event.emote)) return
      if (seenEmotes.current.has(event.id)) return
      seenEmotes.current.add(event.id)

      setEmotes((current) => {
        for (const prior of current) {
          if (prior.playerId !== event.playerId) continue
          const timer = emoteTimers.current.get(prior.id)
          if (timer) window.clearTimeout(timer)
          emoteTimers.current.delete(prior.id)
          seenEmotes.current.delete(prior.id)
        }
        return [
          ...current.filter((item) => item.playerId !== event.playerId),
          event,
        ]
      })

      const timer = window.setTimeout(() => clearEmote(event.id), EMOTE_DURATION_MS)
      emoteTimers.current.set(event.id, timer)
    },
    [clearEmote]
  )

  useEffect(() => {
    if (!identity.id) return
    const store = getGameStore()
    let cancelled = false
    let disconnect = () => {}

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
        const room = store.connect(code, identity.id, {
          onChange: setRecord,
          onPresence: setOnline,
          onEmote: showEmote,
        })
        sendEmoteRef.current = room.sendEmote
        disconnect = room.disconnect
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Could not load game")
        setStatus("error")
      }
    })()

    return () => {
      cancelled = true
      disconnect()
      sendEmoteRef.current = () => {}
      for (const timer of emoteTimers.current.values()) window.clearTimeout(timer)
      emoteTimers.current.clear()
      seenEmotes.current.clear()
      setEmotes([])
    }
  }, [code, identity.id, showEmote])

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
          recordRef.current = next
          setRecord(next)
          setError(null)
          return next
        } catch (err) {
          if (err instanceof VersionConflictError) {
            const fresh = await store.get(code)
            if (fresh) {
              recordRef.current = fresh
              setRecord(fresh)
            }
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

  const sendEmote = useCallback(
    (emote: TableEmote) => {
      if (!identity.id || !isTableEmote(emote)) return
      const event: EmoteEvent = {
        id: crypto.randomUUID(),
        playerId: identity.id,
        emote,
      }
      showEmote(event)
      sendEmoteRef.current(event)
    },
    [identity.id, showEmote]
  )

  return { record, status, error, online, emotes, sendEmote, apply, identity }
}
