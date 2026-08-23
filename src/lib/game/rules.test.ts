import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_FORMULA } from "./types"
import { gameTooltip, historyTooltip } from "./rules"

describe("game tooltip", () => {
  it("shortens rules into a hover label", () => {
    assert.equal(
      gameTooltip({
        kind: "oh-hell",
        seatCount: 2,
        pattern: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
        leadTrump: "always",
        hook: true,
        scoring: DEFAULT_FORMULA,
      }),
      "2-player 1..10..1 Oh Hell"
    )
  })

  it("rewrites stored history summaries", () => {
    assert.equal(
      historyTooltip("2-player, 1…10…1, hook, lead trump always"),
      "2-player 1..10..1 Oh Hell"
    )
    assert.equal(historyTooltip("2-play 1..10..1 Oh Hell"), "2-player 1..10..1 Oh Hell")
  })
})
