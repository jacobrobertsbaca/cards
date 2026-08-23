import { randomName } from "./names"

const ID_KEY = "cards.playerId"
const NAME_KEY = "cards.displayName"

export type Identity = {
  id: string
  name: string
}

function store() {
  const guest =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("guest")
      : null
  return {
    bucket: guest !== null ? sessionStorage : localStorage,
    idKey: guest !== null ? `cards.guestId.${guest || "1"}` : ID_KEY,
    nameKey: guest !== null ? `cards.guestName.${guest || "1"}` : NAME_KEY,
  }
}

let snapshot: Identity | null = null

function read(): Identity {
  const { bucket, idKey, nameKey } = store()
  let id = bucket.getItem(idKey)
  let name = bucket.getItem(nameKey)
  if (!id) {
    id = crypto.randomUUID()
    bucket.setItem(idKey, id)
  }
  if (!name) {
    name = randomName()
    bucket.setItem(nameKey, name)
  }
  if (snapshot && snapshot.id === id && snapshot.name === name) {
    return snapshot
  }
  snapshot = { id, name }
  return snapshot
}

export function getIdentity(): Identity {
  if (typeof window === "undefined") {
    return { id: "", name: "" }
  }
  return read()
}

export function peekIdentity(): Identity {
  if (typeof window === "undefined") {
    return { id: "", name: "" }
  }
  const { bucket, idKey, nameKey } = store()
  const id = bucket.getItem(idKey)
  const name = bucket.getItem(nameKey)
  if (!id || !name) return snapshot ?? { id: "", name: "" }
  if (snapshot && snapshot.id === id && snapshot.name === name) return snapshot
  snapshot = { id, name }
  return snapshot
}

export function setDisplayName(name: string) {
  const trimmed = name.trim().slice(0, 24)
  if (!trimmed) return getIdentity()
  const { bucket, nameKey } = store()
  bucket.setItem(nameKey, trimmed)
  window.dispatchEvent(new Event("cards:identity"))
  return getIdentity()
}

export function subscribeIdentity(listener: (identity: Identity) => void) {
  read()
  const notify = () => listener(getIdentity())
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === ID_KEY ||
      event.key === NAME_KEY ||
      event.key?.startsWith("cards.guestId") ||
      event.key?.startsWith("cards.guestName")
    ) {
      notify()
    }
  }
  window.addEventListener("cards:identity", notify)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener("cards:identity", notify)
    window.removeEventListener("storage", onStorage)
  }
}
