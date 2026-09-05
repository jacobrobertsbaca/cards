import type { GameState } from "@/lib/game/types"
import {
  VersionConflictError,
  type ChatDraft,
  type ChatMessage,
  type EmoteEvent,
  type GameRecord,
  type GameStore,
} from "./types"

const storageKey = (code: string) => `cards.game.${code}`
const chatKey = (code: string) => `cards.chat.${code}`
const channelName = (code: string) => `cards:${code}`

type BusMessage =
  | { kind: "game"; record: GameRecord }
  | { kind: "presence"; type: "ping" | "hello" | "bye"; playerId: string }
  | { kind: "emote"; event: EmoteEvent }
  | { kind: "chat"; message: ChatMessage }

function read(code: string): GameRecord | null {
  const raw = localStorage.getItem(storageKey(code))
  if (!raw) return null
  try {
    return JSON.parse(raw) as GameRecord
  } catch {
    return null
  }
}

function write(record: GameRecord) {
  localStorage.setItem(storageKey(record.code), JSON.stringify(record))
}

function readMessages(code: string): ChatMessage[] {
  const raw = localStorage.getItem(chatKey(code))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeMessages(code: string, messages: ChatMessage[]) {
  localStorage.setItem(chatKey(code), JSON.stringify(messages.slice(-200)))
}

function publish(code: string, message: BusMessage) {
  const channel = new BroadcastChannel(channelName(code))
  channel.postMessage(message)
  channel.close()
}

export function createLocalStore(): GameStore {
  return {
    async create(record) {
      const saved: GameRecord = { ...record, version: 0 }
      write(saved)
      writeMessages(record.code, [])
      publish(record.code, { kind: "game", record: saved })
      return saved
    },
    async get(code) {
      return read(code)
    },
    async save(code, state: GameState, expectedVersion: number) {
      const current = read(code)
      if (!current) throw new Error("Game not found")
      if (current.version !== expectedVersion) {
        throw new VersionConflictError()
      }
      const next: GameRecord = {
        ...current,
        state,
        version: expectedVersion + 1,
      }
      write(next)
      publish(code, { kind: "game", record: next })
      return next
    },
    async listMessages(code) {
      return readMessages(code)
    },
    async sendMessage(code, draft: ChatDraft) {
      const message: ChatMessage = {
        id: draft.id,
        gameCode: code,
        playerId: draft.playerId,
        playerName: draft.playerName,
        body: draft.body,
        createdAt: new Date().toISOString(),
      }
      const next = [...readMessages(code), message]
      writeMessages(code, next)
      publish(code, { kind: "chat", message })
      return message
    },
    connect(code, playerId, handlers) {
      const online = new Set<string>([playerId])
      const channel = new BroadcastChannel(channelName(code))

      const publishPresence = (type: "ping" | "hello" | "bye") => {
        channel.postMessage({ kind: "presence", type, playerId } satisfies BusMessage)
      }

      const onStorage = (event: StorageEvent) => {
        if (event.key === storageKey(code) && event.newValue) {
          handlers.onChange(JSON.parse(event.newValue) as GameRecord)
          return
        }
        if (event.key === chatKey(code) && event.newValue) {
          try {
            const messages = JSON.parse(event.newValue) as ChatMessage[]
            const latest = messages[messages.length - 1]
            if (latest) handlers.onChat(latest)
          } catch {
            /* ignore */
          }
        }
      }

      const onMessage = (event: MessageEvent<BusMessage>) => {
        const data = event.data
        if (!data?.kind) return

        if (data.kind === "game") {
          handlers.onChange(data.record)
          return
        }

        if (data.kind === "emote") {
          const emote = data.event
          if (!emote?.id || !emote.playerId || !emote.emote) return
          handlers.onEmote(emote)
          return
        }

        if (data.kind === "chat") {
          const message = data.message
          if (!message?.id || !message.playerId || !message.body) return
          handlers.onChat(message)
          return
        }

        if (data.kind === "presence") {
          if (!data.playerId) return
          if (data.type === "ping" || data.type === "hello") {
            online.add(data.playerId)
            if (data.type === "hello") publishPresence("ping")
            handlers.onPresence([...online])
          }
          if (data.type === "bye") {
            online.delete(data.playerId)
            handlers.onPresence([...online])
          }
        }
      }

      channel.addEventListener("message", onMessage)
      window.addEventListener("storage", onStorage)
      publishPresence("hello")
      const interval = window.setInterval(() => publishPresence("ping"), 4000)
      handlers.onPresence([...online])

      return {
        sendEmote: (payload) => {
          channel.postMessage({ kind: "emote", event: payload } satisfies BusMessage)
        },
        disconnect: () => {
          publishPresence("bye")
          window.clearInterval(interval)
          window.removeEventListener("storage", onStorage)
          channel.removeEventListener("message", onMessage)
          channel.close()
        },
      }
    },
  }
}
