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

export const EMOTE_DURATION_MS = 2200

/** Stable pseudo-random flight for an emote id (same on every client). */
export function emoteFlight(id: string) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const unit = () => {
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return (h >>> 0) / 4294967295
  }
  return {
    /** Extra unit offset mixed into the seat direction. */
    scatterX: (unit() - 0.5) * 3,
    scatterY: (unit() - 0.5) * 3,
    /** Start nudge in px so stacked emotes don't pile on the same spot. */
    originX: (unit() - 0.5) * 64,
    originY: (unit() - 0.5) * 48,
    rot: (unit() - 0.5) * 42,
    scale: 1.2 + unit() * 0.55,
  }
}
