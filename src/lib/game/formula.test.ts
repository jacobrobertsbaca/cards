import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_FORMULA } from "./types"
import {
  evaluateFormula,
  prettyCondition,
  prettyExpression,
  validateCondition,
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

  it("accepts legacy condition names", () => {
    const formula = {
      cases: [
        { id: "a", condition: "eq", expression: "10+t" },
        { id: "b", condition: "always", expression: "0" },
      ],
    }
    assert.equal(evaluateFormula(formula, 2, 2), 12)
    assert.equal(evaluateFormula(formula, 2, 1), 0)
  })

  it("evaluates cases top to bottom", () => {
    const formula = {
      cases: [
        { id: "nil", condition: "b = 0 and t = 0", expression: "10" },
        { id: "make", condition: "b = t", expression: "10 + t" },
        { id: "else", condition: "otherwise", expression: "-b" },
      ],
    }
    assert.equal(evaluateFormula(formula, 0, 0), 10)
    assert.equal(evaluateFormula(formula, 3, 3), 13)
    assert.equal(evaluateFormula(formula, 4, 1), -4)
  })

  it("evaluates exponents", () => {
    const formula = {
      cases: [{ id: "a", condition: "otherwise", expression: "t^2" }],
    }
    assert.equal(evaluateFormula(formula, 0, 4), 16)
    assert.equal(
      evaluateFormula(
        { cases: [{ id: "a", condition: "otherwise", expression: "2^3^2" }] },
        0,
        0
      ),
      512
    )
  })

  it("allows implicit multiplication", () => {
    const formula = {
      cases: [{ id: "a", condition: "otherwise", expression: "10t" }],
    }
    assert.equal(evaluateFormula(formula, 1, 3), 30)
  })

  it("pretty-prints math", () => {
    assert.equal(prettyExpression("10+t"), "10 + t")
    assert.equal(prettyExpression("10*t"), "10t")
    assert.equal(prettyCondition("b!=t"), "b ≠ t")
    assert.equal(prettyCondition("b>=t and t>0"), "b ≥ t and t > 0")
    assert.equal(prettyCondition("else"), "otherwise")
    assert.equal(prettyExpression("t^2"), "t^2")
    assert.equal(prettyExpression("10**2"), "10^2")
  })

  it("rejects invalid formulas", () => {
    assert.ok(validateExpression("10 +"))
    assert.ok(validateCondition("b"))
    assert.equal(validateCondition("b = t"), null)
    assert.equal(validateExpression("10 + t"), null)
  })
})
