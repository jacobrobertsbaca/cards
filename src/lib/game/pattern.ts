import { maxHandSize } from "./cards"

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

export function buildFlat(size: number, rounds: number) {
  return Array.from({ length: rounds }, () => size)
}

export function patternLabel(pattern: number[]) {
  if (pattern.length === 0) return "—"
  const max = Math.max(...pattern)
  const upDown = buildUpDown(max)
  const up = buildUp(max)
  const down = buildDown(max)
  if (same(pattern, upDown)) return `1…${max}…1`
  if (same(pattern, up)) return `1…${max}`
  if (same(pattern, down)) return `${max}…1`
  if (pattern.every((n) => n === pattern[0])) {
    return `${pattern[0]} × ${pattern.length}`
  }
  if (pattern.length <= 8) return pattern.join(" · ")
  return `${pattern[0]}…${pattern[pattern.length - 1]} · ${pattern.length} rounds`
}

function same(a: number[], b: number[]) {
  return a.length === b.length && a.every((n, i) => n === b[i])
}

export function validatePattern(pattern: number[], seatCount: number) {
  if (pattern.length === 0) return "Add at least one round"
  const cap = maxHandSize(seatCount)
  if (pattern.some((n) => !Number.isInteger(n) || n < 1)) {
    return "Each round needs at least 1 card"
  }
  if (pattern.some((n) => n > cap)) {
    return `${seatCount} players can hold at most ${cap} cards`
  }
  return null
}
