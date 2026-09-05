export const CHAT_MAX_LENGTH = 280
export const CHAT_BUBBLE_DURATION_MS = 4000

export function normalizeChatBody(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, CHAT_MAX_LENGTH)
}

/** Compact relative age: now, 6s, 2m, 5h, 3d, 2w, 1y. */
export function chatTimeAgo(iso: string, now = Date.now()) {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ""
  const seconds = Math.max(0, Math.floor((now - then) / 1000))
  if (seconds <= 5) return "now"
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.max(1, Math.round(seconds / 3600))
  if (hours < 24) return `${hours}h`
  const days = Math.max(1, Math.round(seconds / 86_400))
  if (days < 7) return `${days}d`
  const weeks = Math.max(1, Math.round(seconds / 604_800))
  if (weeks < 52) return `${weeks}w`
  return `${Math.max(1, Math.round(seconds / 31_536_000))}y`
}

export function chatExactTime(iso: string) {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ""
  return new Date(then).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
