import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { createLocalStore } from "./local"
import { createSupabaseStore } from "./supabase"
import type { GameStore } from "./types"

export type { GameRecord, GameStore } from "./types"
export { VersionConflictError } from "./types"

export function getGameStore(): GameStore {
  if (isSupabaseConfigured()) {
    const client = createBrowserClient()
    if (client) return createSupabaseStore(client)
  }
  return createLocalStore()
}

export function storeMode() {
  return isSupabaseConfigured() ? "supabase" : "local"
}
