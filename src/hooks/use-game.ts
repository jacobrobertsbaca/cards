"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CHAT_BUBBLE_DURATION_MS, normalizeChatBody } from "@/lib/chat"
import { EMOTE_DURATION_MS, isTableEmote, type TableEmote } from "@/lib/emotes"
import type { GameState } from "@/lib/game/types"
import {
  getGameStore,
  VersionConflictError,
  type ChatMessage,
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatBubbles, setChatBubbles] = useState<ChatMessage[]>([])
  const recordRef = useRef(record)
  recordRef.current = record
  const sendEmoteRef = useRef<(event: EmoteEvent) => void>(() => {})
  const emoteTimers = useRef(new Map<string, number>())
  const seenEmotes = useRef(new Set<string>())
  const chatBubbleTimers = useRef(new Map<string, number>())
  const seenMessages = useRef(new Set<string>())
  const seenBubbles = useRef(new Set<string>())

  const clearEmote = useCallback((id: string) => {
    const timer = emoteTimers.current.get(id)
    if (timer) window.clearTimeout(timer)
    emoteTimers.current.delete(id)
    seenEmotes.current.delete(id)
    setEmotes((current) => current.filter((item) => item.id !== id))
  }, [])

  const clearChatBubble = useCallback((id: string) => {
    const timer = chatBubbleTimers.current.get(id)
    if (timer) window.clearTimeout(timer)
    chatBubbleTimers.current.delete(id)
    seenBubbles.current.delete(id)
    setChatBubbles((current) => current.filter((item) => item.id !== id))
  }, [])

  const showEmote = useCallback(
    (event: EmoteEvent) => {
      if (!isTableEmote(event.emote)) return
      if (seenEmotes.current.has(event.id)) return
      seenEmotes.current.add(event.id)

      setEmotes((current) => [...current, event].slice(-24))

      const timer = window.setTimeout(() => clearEmote(event.id), EMOTE_DURATION_MS)
      emoteTimers.current.set(event.id, timer)
    },
    [clearEmote]
  )

  const showChatBubble = useCallback(
    (message: ChatMessage) => {
      if (seenBubbles.current.has(message.id)) return
      seenBubbles.current.add(message.id)

      setChatBubbles((current) => {
        for (const prior of current) {
          if (prior.playerId !== message.playerId) continue
          const timer = chatBubbleTimers.current.get(prior.id)
          if (timer) window.clearTimeout(timer)
          chatBubbleTimers.current.delete(prior.id)
          seenBubbles.current.delete(prior.id)
        }
        return [
          ...current.filter((item) => item.playerId !== message.playerId),
          message,
        ]
      })

      const timer = window.setTimeout(
        () => clearChatBubble(message.id),
        CHAT_BUBBLE_DURATION_MS
      )
      chatBubbleTimers.current.set(message.id, timer)
    },
    [clearChatBubble]
  )

  const receiveChat = useCallback(
    (message: ChatMessage, { animate = true }: { animate?: boolean } = {}) => {
      if (!message.id || !message.body) return
      const isNew = !seenMessages.current.has(message.id)
      if (isNew) {
        seenMessages.current.add(message.id)
        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) return current
          return [...current, message].slice(-200)
        })
      }
      if (animate && isNew) showChatBubble(message)
    },
    [showChatBubble]
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

        const history = await store.listMessages(code)
        if (cancelled) return
        for (const message of history) seenMessages.current.add(message.id)
        setMessages(history)

        const room = store.connect(code, identity.id, {
          onChange: setRecord,
          onPresence: setOnline,
          onEmote: showEmote,
          onChat: (message) => receiveChat(message),
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
      for (const timer of chatBubbleTimers.current.values()) {
        window.clearTimeout(timer)
      }
      chatBubbleTimers.current.clear()
      seenBubbles.current.clear()
      setChatBubbles([])
      seenMessages.current.clear()
      setMessages([])
    }
  }, [code, identity.id, receiveChat, showEmote])

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

  const sendChat = useCallback(
    async (raw: string) => {
      const body = normalizeChatBody(raw)
      if (!identity.id || !body) return
      const draft = {
        id: crypto.randomUUID(),
        playerId: identity.id,
        playerName: identity.name || "Player",
        body,
      }
      const optimistic: ChatMessage = {
        ...draft,
        gameCode: code,
        createdAt: new Date().toISOString(),
      }
      receiveChat(optimistic)
      try {
        const saved = await getGameStore().sendMessage(code, draft)
        receiveChat(saved, { animate: false })
      } catch (err) {
        seenMessages.current.delete(draft.id)
        clearChatBubble(draft.id)
        setMessages((current) => current.filter((item) => item.id !== draft.id))
        throw err
      }
    },
    [clearChatBubble, code, identity.id, identity.name, receiveChat]
  )

  return {
    record,
    status,
    error,
    online,
    emotes,
    messages,
    chatBubbles,
    sendEmote,
    sendChat,
    apply,
    identity,
  }
}
