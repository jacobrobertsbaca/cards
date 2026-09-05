import type { SupabaseClient } from "@supabase/supabase-js"
import type { GameState } from "@/lib/game/types"
import {
  VersionConflictError,
  type ChatDraft,
  type ChatMessage,
  type EmoteEvent,
  type GameRecord,
  type GameStore,
} from "./types"

type GameRow = {
  code: string
  kind: "oh-hell" | "bridge"
  state: GameState
  version: number
}

type MessageRow = {
  id: string
  game_code: string
  player_id: string
  player_name: string
  body: string
  kind: "chat" | "state" | null
  created_at: string
}

function toRecord(row: GameRow): GameRecord {
  return {
    code: row.code,
    kind: row.kind,
    state: row.state,
    version: row.version,
  }
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    gameCode: row.game_code,
    playerId: row.player_id,
    playerName: row.player_name,
    body: row.body,
    kind: row.kind === "state" ? "state" : "chat",
    createdAt: row.created_at,
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
    async listMessages(code) {
      const { data, error } = await client
        .from("game_messages")
        .select("id, game_code, player_id, player_name, body, kind, created_at")
        .eq("game_code", code)
        .order("created_at", { ascending: true })
        .limit(200)
      if (error) throw error
      return ((data as MessageRow[] | null) ?? []).map(toMessage)
    },
    async sendMessage(code, draft: ChatDraft) {
      const { data, error } = await client
        .from("game_messages")
        .insert({
          id: draft.id,
          game_code: code,
          player_id: draft.playerId,
          player_name: draft.playerName,
          body: draft.body,
          kind: draft.kind ?? "chat",
        })
        .select("id, game_code, player_id, player_name, body, kind, created_at")
        .single()
      if (error) throw error
      return toMessage(data as MessageRow)
    },
    connect(code, playerId, handlers) {
      const channel = client.channel(`game:${code}`, {
        config: { presence: { key: playerId } },
      })
      let ready = false
      const queue: EmoteEvent[] = []

      const flushEmote = (event: EmoteEvent) => {
        void channel.send({
          type: "broadcast",
          event: "emote",
          payload: event,
        })
      }

      const publishPresence = () => {
        handlers.onPresence(Object.keys(channel.presenceState()))
      }

      channel
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
            if (row?.state) handlers.onChange(toRecord(row))
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "game_messages",
            filter: `game_code=eq.${code}`,
          },
          (payload) => {
            const row = payload.new as MessageRow | null
            if (!row?.id || !row.player_id || !row.body) return
            handlers.onChat(toMessage(row))
          }
        )
        .on("presence", { event: "sync" }, publishPresence)
        .on("broadcast", { event: "emote" }, ({ payload }) => {
          const data = payload as EmoteEvent | null
          if (!data?.id || !data.playerId || !data.emote) return
          handlers.onEmote(data)
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return
          ready = true
          await channel.track({ playerId })
          for (const event of queue.splice(0)) flushEmote(event)
        })

      return {
        sendEmote: (event) => {
          if (!ready) {
            queue.push(event)
            return
          }
          flushEmote(event)
        },
        disconnect: () => {
          void client.removeChannel(channel)
        },
      }
    },
  }
}
