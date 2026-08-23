import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { defaultGameTitle, displayGameTitle, timeOfDayLabel } from "./title"

describe("game titles", () => {
  it("names a table by time of day", () => {
    assert.equal(timeOfDayLabel(new Date(2026, 7, 22, 0, 30)), "Midnight")
    assert.equal(timeOfDayLabel(new Date(2026, 7, 22, 8, 0)), "Morning")
    assert.equal(timeOfDayLabel(new Date(2026, 7, 22, 15, 0)), "Afternoon")
    assert.equal(timeOfDayLabel(new Date(2026, 7, 22, 19, 0)), "Evening")
    assert.equal(timeOfDayLabel(new Date(2026, 7, 22, 22, 0)), "Night")
    assert.equal(defaultGameTitle("oh-hell", new Date(2026, 7, 22, 15, 0)), "Afternoon Oh Hell")
  })

  it("falls back when a title is missing", () => {
    assert.equal(displayGameTitle(""), "Oh Hell")
    assert.equal(displayGameTitle("  Night Oh Hell  "), "Night Oh Hell")
    assert.equal(
      displayGameTitle("", Date.parse("2026-08-22T15:00:00")),
      "Afternoon Oh Hell"
    )
  })
})
