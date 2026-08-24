export const TABLE_EMOTES = [
  "heart",
  "thumbs-up",
  "exclaim",
  "laugh",
  "haha",
  "thumbs-down",
  "question",
  "sob",
] as const

export type TableEmote = (typeof TABLE_EMOTES)[number]

export const EMOTE_LABELS: Record<TableEmote, string> = {
  heart: "Love",
  "thumbs-up": "Thumbs up",
  "thumbs-down": "Thumbs down",
  haha: "Ha ha",
  laugh: "Laugh",
  exclaim: "Exclamation",
  question: "Question",
  sob: "Sobbing",
}

const allowed = new Set<string>(TABLE_EMOTES)

export function isTableEmote(value: string): value is TableEmote {
  return allowed.has(value)
}

export const EMOTE_DURATION_MS = 5000
