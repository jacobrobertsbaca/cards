export type PastGame = {
  code: string
  kind: "oh-hell"
  title?: string
  startedAt: number
  lastSeenAt: number
  summary: string
  finished?: boolean
}

const KEY = "cards.history"

let snapshot: PastGame[] = []
let snapshotRaw = ""

function read(): PastGame[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY) ?? "[]"
    if (raw === snapshotRaw) return snapshot
    snapshotRaw = raw
    snapshot = JSON.parse(raw) as PastGame[]
    return snapshot
  } catch {
    snapshotRaw = ""
    snapshot = []
    return snapshot
  }
}

function write(games: PastGame[]) {
  localStorage.setItem(KEY, JSON.stringify(games.slice(0, 40)))
  window.dispatchEvent(new Event("cards:history"))
}

export function listHistory() {
  return read().sort((a, b) => b.startedAt - a.startedAt)
}

export function rememberGame(entry: Omit<PastGame, "startedAt" | "lastSeenAt"> & {
  startedAt?: number
}) {
  const now = Date.now()
  const games = read()
  const existing = games.find((game) => game.code === entry.code)
  if (existing) {
    existing.lastSeenAt = now
    existing.summary = entry.summary
    if (entry.title) existing.title = entry.title
    if (entry.finished) existing.finished = true
  } else {
    games.unshift({
      ...entry,
      startedAt: entry.startedAt ?? now,
      lastSeenAt: now,
    })
  }
  write(games)
}

export function forgetGame(code: string) {
  write(read().filter((game) => game.code !== code))
}

export function subscribeHistory(listener: (games: PastGame[]) => void) {
  const notify = () => listener(listHistory())
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) notify()
  }
  window.addEventListener("cards:history", notify)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener("cards:history", notify)
    window.removeEventListener("storage", onStorage)
  }
}
