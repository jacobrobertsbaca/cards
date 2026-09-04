import type { GameState } from "@/lib/game/types"

export type GameRecord = {
  code: string
  kind: "oh-hell" | "bridge"
  state: GameState
  version: number
}

export class VersionConflictError extends Error {
  constructor() {
    super("Game changed, retrying")
    this.name = "VersionConflictError"
  }
}

export type PresenceHandler = (playerIds: string[]) => void

export type EmoteEvent = {
  id: string
  playerId: string
  emote: string
}

export type RoomHandlers = {
  onChange: (record: GameRecord) => void
  onPresence: PresenceHandler
  onEmote: (event: EmoteEvent) => void
}

export type RoomConnection = {
  sendEmote: (event: EmoteEvent) => void
  disconnect: () => void
}

export interface GameStore {
  create(record: Omit<GameRecord, "version">): Promise<GameRecord>
  get(code: string): Promise<GameRecord | null>
  save(
    code: string,
    state: GameState,
    expectedVersion: number
  ): Promise<GameRecord>
  connect(
    code: string,
    playerId: string,
    handlers: RoomHandlers
  ): RoomConnection
}
