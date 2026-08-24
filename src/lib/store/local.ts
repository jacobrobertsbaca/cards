import type { GameState } from "@/lib/game/types"
import {
  VersionConflictError,
  type EmoteEvent,
  type GameRecord,
  type GameStore,
} from "./types"

const storageKey = (code: string) => `cards.game.${code}`
const channelName = (code: string) => `cards:${code}`

type BusMessage =
  | { kind: "game"; record: GameRecord }
  | { kind: "presence"; type: "ping" | "hello" | "bye"; playerId: string }
  | { kind: "emote"; event: EmoteEvent }

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
    connect(code, playerId, handlers) {
      const online = new Set<string>([playerId])
      const channel = new BroadcastChannel(channelName(code))

      const publishPresence = (type: "ping" | "hello" | "bye") => {
        channel.postMessage({ kind: "presence", type, playerId } satisfies BusMessage)
      }

      const onStorage = (event: StorageEvent) => {
        if (event.key !== storageKey(code) || !event.newValue) return
        handlers.onChange(JSON.parse(event.newValue) as GameRecord)
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
