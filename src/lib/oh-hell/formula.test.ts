import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_FORMULA } from "./types"
import {
  evaluateFormula,
  prettyExpression,
  validateExpression,
} from "./formula"

describe("scoring formula", () => {
  it("scores a made bid as 10 + t", () => {
    assert.equal(evaluateFormula(DEFAULT_FORMULA, 3, 3), 13)
    assert.equal(evaluateFormula(DEFAULT_FORMULA, 0, 0), 10)
  })

  it("scores a miss as tricks taken", () => {
    assert.equal(evaluateFormula(DEFAULT_FORMULA, 3, 1), 1)
  })

  it("uses made and miss expressions", () => {
    const formula = {
      made: "10 + t",
      miss: "0",
    }
    assert.equal(evaluateFormula(formula, 2, 2), 12)
    assert.equal(evaluateFormula(formula, 2, 1), 0)
  })

  it("evaluates exponents", () => {
    assert.equal(
      evaluateFormula({ made: "t^2", miss: "t" }, 4, 4),
      16
    )
    assert.equal(
      evaluateFormula({ made: "t", miss: "2^3^2" }, 1, 0),
      512
    )
  })

  it("allows implicit multiplication", () => {
    assert.equal(
      evaluateFormula({ made: "10t", miss: "t" }, 3, 3),
      30
    )
  })

  it("pretty-prints math", () => {
    assert.equal(prettyExpression("10+t"), "10+t")
    assert.equal(prettyExpression("10 + t"), "10+t")
    assert.equal(prettyExpression("10*t"), "10t")
    assert.equal(prettyExpression("t^2"), "t^2")
    assert.equal(prettyExpression("10**2"), "10^2")
  })

  it("rejects invalid formulas", () => {
    assert.ok(validateExpression("10 +"))
    assert.ok(validateExpression("b"))
    assert.equal(validateExpression("10 + t"), null)
  })
})
