import type { SupabaseClient } from "@supabase/supabase-js"
import type { GameState } from "@/lib/game/types"
import { VersionConflictError, type GameRecord, type GameStore } from "./types"

type GameRow = {
  code: string
  kind: "oh-hell"
  state: GameState
  version: number
}

function toRecord(row: GameRow): GameRecord {
  return {
    code: row.code,
    kind: row.kind,
    state: row.state,
    version: row.version,
  }
}

export function createSupabaseStore(client: SupabaseClient): GameStore {
  return {
    async create(record) {
      const { data, error } = await client
        .from("games")
        .insert({
          code: record.code,
          kind: record.kind,
          state: record.state,
          version: 0,
        })
        .select("code, kind, state, version")
        .single()
      if (error) throw error
      return toRecord(data as GameRow)
    },
    async get(code) {
      const { data, error } = await client
        .from("games")
        .select("code, kind, state, version")
        .eq("code", code)
        .maybeSingle()
      if (error) throw error
      return data ? toRecord(data as GameRow) : null
    },
    async save(code, state, expectedVersion) {
      const { data, error } = await client
        .from("games")
        .update({ state, version: expectedVersion + 1 })
        .eq("code", code)
        .eq("version", expectedVersion)
        .select("code, kind, state, version")
        .maybeSingle()
      if (error) throw error
      if (!data) throw new VersionConflictError()
      return toRecord(data as GameRow)
    },
    subscribe(code, onChange) {
      const channel = client
        .channel(`game-row:${code}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "games",
            filter: `code=eq.${code}`,
          },
          (payload) => {
            const row = (payload.new ?? payload.old) as GameRow | null
            if (row?.state) onChange(toRecord(row))
          }
        )
        .subscribe()
      return () => {
        void client.removeChannel(channel)
      }
    },
    trackPresence(code, playerId, onPresence) {
      const channel = client.channel(`game-presence:${code}`, {
        config: { presence: { key: playerId } },
      })
      const publish = () => {
        const ids = Object.keys(channel.presenceState())
        onPresence(ids)
      }
      channel
        .on("presence", { event: "sync" }, publish)
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ playerId })
          }
        })
      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}
