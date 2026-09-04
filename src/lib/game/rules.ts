import type { GameSettings } from "./types"
import { isBridgeSettings, isOhHellSettings } from "./types"
import { bridgeGameTooltip, bridgeRulesLine } from "@/lib/bridge/rules"
import {
  gameTooltip as ohHellTooltip,
  historyTooltip as ohHellHistory,
  rulesLine as ohHellRules,
  scoringBlurb as ohHellScoringBlurb,
} from "@/lib/oh-hell/rules"

export function rulesLine(settings: GameSettings) {
  if (isBridgeSettings(settings)) return bridgeRulesLine(settings)
  return ohHellRules(settings)
}

export function gameTooltip(settings: GameSettings) {
  if (isBridgeSettings(settings)) return bridgeGameTooltip(settings)
  return ohHellTooltip(settings)
}

export function historyTooltip(summary: string) {
  if (summary.toLowerCase().includes("bridge")) return summary
  return ohHellHistory(summary)
}

export function scoringBlurb(settings: GameSettings) {
  if (isOhHellSettings(settings)) return ohHellScoringBlurb(settings)
  return "Standard rubber bridge scoring"
}
