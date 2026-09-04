import { formulaExplanation } from "./formula"
import { patternLabel } from "./pattern"
import type { OhHellSettings as GameSettings } from "./types"

export function rulesLine(settings: GameSettings) {
  return compactRules(`${settings.seatCount}-player`, patternLabel(settings.pattern))
}

export function gameTooltip(settings: GameSettings) {
  return rulesLine(settings)
}

export function historyTooltip(summary: string) {
  if (summary.includes("Oh Hell") && !summary.includes(",")) {
    return summary.replaceAll("…", "..").replace("-play ", "-player ")
  }
  const match = summary.match(/^(\d+-play(?:er)?),?\s*([^,]+)/i)
  if (!match) return summary
  return compactRules(match[1], match[2])
}

function compactRules(players: string, pattern: string) {
  const count = players.replace(/-play$/i, "-player")
  const compact = pattern.trim().replaceAll("…", "..")
  return `${count} ${compact} Oh Hell`
}

export function scoringBlurb(settings: GameSettings) {
  return formulaExplanation(settings.scoring)
}
