"use client"

import { useSyncExternalStore } from "react"
import { peekIdentity, subscribeIdentity } from "@/lib/identity"

const empty = { id: "", name: "" }

export function useIdentity() {
  return useSyncExternalStore(subscribeIdentity, peekIdentity, () => empty)
}
