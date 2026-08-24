import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { TRAINED_BOT_PARAMS } from "./params"
import { resetSearchBudget, setSearchBudget } from "./search"
import {
  defaultSettings,
  makeParamBot,
  makeStrongBot,
  runCandidateVsLegacy,
  runSimulation,
} from "./sim"

describe("bot strength", () => {
  it("finishes full simulations without errors", () => {
    setSearchBudget({ bidSamples: 16, deepBidSamples: 6, playSamples: 12 })
    try {
      const brains = Array.from({ length: 4 }, () => makeStrongBot())
      const state = runSimulation(brains, {
        ...defaultSettings(),
        pattern: [3, 2, 1],
      })
      assert.equal(state.phase, "game-over")
      assert.ok(state.scores.every((score) => Number.isFinite(score)))
    } finally {
      resetSearchBudget()
    }
  })

  it("always chooses legal bids and plays in a short mirror match", () => {
    setSearchBudget({ bidSamples: 20, deepBidSamples: 8, playSamples: 14 })
    try {
      const trained = makeStrongBot()
      const totals = runCandidateVsLegacy(trained, 6, {
        ...defaultSettings(),
        pattern: [3, 2, 1, 2, 3],
      })
      assert.ok(totals[0] >= 0)
    } finally {
      resetSearchBudget()
    }
  })

  it("heuristic bot beats the legacy bot by a meaningful margin", () => {
    const games = 70
    const trained = makeParamBot(TRAINED_BOT_PARAMS)
    const totals = runCandidateVsLegacy(trained, games)
    const trainedAvg = totals[0] / games
    const legacyAvg =
      totals.slice(1).reduce((sum, score) => sum + score, 0) /
      (games * (defaultSettings().seatCount - 1))

    assert.ok(
      trainedAvg > legacyAvg + 6,
      `expected heuristic bot to lead legacy by >6 pts/game, got ${(trainedAvg - legacyAvg).toFixed(2)}`
    )
  })

  it("strong bot dominates the legacy bot", () => {
    setSearchBudget({ bidSamples: 80, deepBidSamples: 28, playSamples: 32 })
    try {
      const games = 48
      const strong = makeStrongBot()
      const totals = runCandidateVsLegacy(strong, games, {
        ...defaultSettings(),
        pattern: [4, 3, 2, 1, 2, 3, 4],
      })
      const strongAvg = totals[0] / games
      const legacyAvg =
        totals.slice(1).reduce((sum, score) => sum + score, 0) /
        (games * (defaultSettings().seatCount - 1))

      assert.ok(
        strongAvg > legacyAvg + 8,
        `expected strong bot to lead legacy by >8 pts/game, got ${(strongAvg - legacyAvg).toFixed(2)}`
      )
    } finally {
      resetSearchBudget()
    }
  })
})
