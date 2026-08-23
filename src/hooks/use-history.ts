"use client"

import { useSyncExternalStore } from "react"
import { listHistory, subscribeHistory, type PastGame } from "@/lib/history"

const EMPTY: PastGame[] = []

export function useHistory() {
  return useSyncExternalStore(subscribeHistory, listHistory, () => EMPTY)
}
