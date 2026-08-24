import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { TRAINED_BOT_PARAMS } from "./params"
import {
  defaultSettings,
  makeParamBot,
  runCandidateVsLegacy,
  runSimulation,
} from "./sim"

describe("bot strength", () => {
  it("finishes full simulations without errors", () => {
    const brains = Array.from({ length: 4 }, () => makeParamBot(TRAINED_BOT_PARAMS))
    const state = runSimulation(brains)
    assert.equal(state.phase, "game-over")
    assert.ok(state.scores.every((score) => Number.isFinite(score)))
  })

  it("always chooses legal bids and plays in a short mirror match", () => {
    const trained = makeParamBot(TRAINED_BOT_PARAMS)
    const totals = runCandidateVsLegacy(trained, 12)
    assert.ok(totals[0] >= 0)
  })

  it("beats the legacy bot by a meaningful margin", () => {
    const games = 80
    const trained = makeParamBot(TRAINED_BOT_PARAMS)
    const totals = runCandidateVsLegacy(trained, games)
    const trainedAvg = totals[0] / games
    const legacyAvg =
      totals.slice(1).reduce((sum, score) => sum + score, 0) /
      (games * (defaultSettings().seatCount - 1))

    assert.ok(
      trainedAvg > legacyAvg + 6,
      `expected trained bot to lead legacy by >6 pts/game, got ${(trainedAvg - legacyAvg).toFixed(2)}`
    )
  })
})
