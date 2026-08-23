import type { GameState } from "@/lib/game/types"

export type GameRecord = {
  code: string
  kind: "oh-hell"
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

export interface GameStore {
  create(record: Omit<GameRecord, "version">): Promise<GameRecord>
  get(code: string): Promise<GameRecord | null>
  save(
    code: string,
    state: GameState,
    expectedVersion: number
  ): Promise<GameRecord>
  subscribe(code: string, onChange: (record: GameRecord) => void): () => void
  trackPresence(
    code: string,
    playerId: string,
    onPresence: PresenceHandler
  ): () => void
}
