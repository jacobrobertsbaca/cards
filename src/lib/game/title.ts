import type { GameSettings } from "./types"

export function timeOfDayLabel(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return "Midnight"
  if (hour < 12) return "Morning"
  if (hour < 17) return "Afternoon"
  if (hour < 21) return "Evening"
  return "Night"
}

export function defaultGameTitle(
  kind: GameSettings["kind"] = "oh-hell",
  date = new Date()
) {
  const game = kind === "oh-hell" ? "Oh Hell" : "Game"
  return `${timeOfDayLabel(date)} ${game}`
}

export function displayGameTitle(
  title: string | undefined | null,
  startedAt?: number
) {
  const trimmed = title?.trim()
  if (trimmed) return trimmed
  if (startedAt) return defaultGameTitle("oh-hell", new Date(startedAt))
  return "Oh Hell"
}
