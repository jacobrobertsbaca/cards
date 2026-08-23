import type { GameState } from "@/lib/game/types"
import { VersionConflictError, type GameRecord, type GameStore } from "./types"

const storageKey = (code: string) => `cards.game.${code}`
const channelName = (code: string) => `cards:${code}`

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

export function createLocalStore(): GameStore {
  return {
    async create(record) {
      const saved: GameRecord = { ...record, version: 0 }
      write(saved)
      const created = new BroadcastChannel(channelName(record.code))
      created.postMessage(saved)
      created.close()
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
      const updated = new BroadcastChannel(channelName(code))
      updated.postMessage(next)
      updated.close()
      return next
    },
    subscribe(code, onChange) {
      const onStorage = (event: StorageEvent) => {
        if (event.key !== storageKey(code) || !event.newValue) return
        onChange(JSON.parse(event.newValue) as GameRecord)
      }
      const channel = new BroadcastChannel(channelName(code))
      channel.onmessage = (event) => onChange(event.data as GameRecord)
      window.addEventListener("storage", onStorage)
      return () => {
        window.removeEventListener("storage", onStorage)
        channel.close()
      }
    },
    trackPresence(code, playerId, onPresence) {
      const channel = new BroadcastChannel(`cards:presence:${code}`)
      const online = new Set<string>([playerId])
      const ping = () => channel.postMessage({ type: "ping", playerId })
      const onMessage = (event: MessageEvent<{ type: string; playerId: string }>) => {
        if (!event.data?.playerId) return
        if (event.data.type === "ping" || event.data.type === "hello") {
          online.add(event.data.playerId)
          if (event.data.type === "hello") ping()
          onPresence([...online])
        }
        if (event.data.type === "bye") {
          online.delete(event.data.playerId)
          onPresence([...online])
        }
      }
      channel.addEventListener("message", onMessage)
      channel.postMessage({ type: "hello", playerId })
      const interval = window.setInterval(ping, 4000)
      onPresence([...online])
      return () => {
        channel.postMessage({ type: "bye", playerId })
        window.clearInterval(interval)
        channel.close()
      }
    },
  }
}
