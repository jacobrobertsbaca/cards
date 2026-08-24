import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildDown,
  buildUp,
  buildUpDown,
  parsePattern,
  patternLabel,
  validatePattern,
} from "./pattern"

describe("parsePattern", () => {
  it("counts between numbers, repeating when a value stays the same", () => {
    assert.deepEqual(parsePattern("1…10…1"), buildUpDown(10))
    assert.deepEqual(parsePattern("1..7..1"), buildUpDown(7))
    assert.deepEqual(parsePattern("1...10"), buildUp(10))
    assert.deepEqual(parsePattern("10…1"), buildDown(10))
    assert.deepEqual(
      parsePattern("1..1..10"),
      [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    )
    assert.deepEqual(parsePattern("7"), [7])
  })

  it("returns null for empty or invalid text", () => {
    assert.equal(parsePattern(""), null)
    assert.equal(parsePattern("  "), null)
    assert.equal(parsePattern("nope"), null)
    assert.equal(parsePattern("1.."), null)
    assert.equal(parsePattern("5x8"), null)
  })

  it("clamps trick counts to 1..10", () => {
    assert.deepEqual(parsePattern("0"), [1])
    assert.deepEqual(parsePattern("12"), [10])
    assert.deepEqual(parsePattern("1..15..1"), buildUpDown(10))
    assert.deepEqual(parsePattern("15…1"), buildDown(10))
  })

  it("round-trips labels", () => {
    for (const pattern of [
      buildUpDown(10),
      buildUp(10),
      buildDown(10),
      [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    ]) {
      assert.deepEqual(parsePattern(patternLabel(pattern)), pattern)
    }
  })
})

describe("validatePattern", () => {
  it("rejects hands that cannot be dealt", () => {
    assert.equal(validatePattern(buildUp(20), 5), "5 players can hold at most 10 cards")
    assert.equal(validatePattern([1, 2, 3], 2), null)
  })
})
