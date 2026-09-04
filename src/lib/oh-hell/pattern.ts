import { maxHandSize } from "./cards"

export const MIN_TRICKS = 1
export const MAX_TRICKS = 10

export function clampTricks(n: number) {
  return Math.min(MAX_TRICKS, Math.max(MIN_TRICKS, n))
}

export function buildUpDown(max: number) {
  const up = Array.from({ length: max }, (_, i) => i + 1)
  const down = Array.from({ length: max - 1 }, (_, i) => max - 1 - i)
  return [...up, ...down]
}

export function buildUp(max: number) {
  return Array.from({ length: max }, (_, i) => i + 1)
}

export function buildDown(max: number) {
  return Array.from({ length: max }, (_, i) => max - i)
}

export function patternLabel(pattern: number[]) {
  if (pattern.length === 0) return "—"
  return waypoints(pattern).join("…")
}

export function parsePattern(input: string): number[] | null {
  const text = input.trim()
  if (!text) return null

  const parts = text.split(/\s*(?:\.{2,}|…|,|;|·|\s)+\s*/)
  if (parts.length === 0 || parts.some((part) => !/^\d+$/.test(part))) return null

  return expandRange(parts.map((part) => clampTricks(Number(part))))
}

export function samePattern(a: number[], b: number[]) {
  return a.length === b.length && a.every((n, i) => n === b[i])
}

function expandRange(points: number[]) {
  const result = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const from = result[result.length - 1]
    const to = points[i]
    if (from === to) {
      result.push(to)
      continue
    }
    const step = from < to ? 1 : -1
    for (let n = from + step; n !== to + step; n += step) result.push(n)
  }
  return result
}

function waypoints(pattern: number[]) {
  const out = [pattern[0]]
  let dir = 0
  for (let i = 1; i < pattern.length; i++) {
    const step = Math.sign(pattern[i] - pattern[i - 1])
    if (step === 0) {
      out.push(pattern[i])
      dir = 0
      continue
    }
    if (dir !== 0 && step !== dir && out[out.length - 1] !== pattern[i - 1]) {
      out.push(pattern[i - 1])
    }
    dir = step
  }
  const last = pattern[pattern.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

export function validatePattern(pattern: number[], seatCount: number) {
  if (pattern.length === 0) return "Add at least one round"
  const cap = Math.min(MAX_TRICKS, maxHandSize(seatCount))
  if (pattern.some((n) => !Number.isInteger(n) || n < MIN_TRICKS)) {
    return "Each round needs at least 1 card"
  }
  if (pattern.some((n) => n > cap)) {
    return `${seatCount} players can hold at most ${cap} cards`
  }
  return null
}
