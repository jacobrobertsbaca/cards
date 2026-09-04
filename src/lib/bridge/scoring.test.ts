import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  dealNetPoints,
  playFromHistory,
  scoreRubber,
  sidePoints,
} from "./scoring"

describe("rubber bridge scoring", () => {
  it("scores a part-score NT contract below the line", () => {
    const play = scoreRubber([
      {
        declarer: "NS",
        contract: { level: 2, strain: "notrump", doubles: 0 },
        tricks: 9,
      },
    ])
    assert.equal(sidePoints(play, "NS"), 70 + 30) // 40+30 below + 30 overtrick
    assert.equal(play.games[0].sides.NS.below[0].points, 70)
    assert.equal(play.games[0].sides.NS.above[0].points, 30)
  })

  it("awards game and rubber bonus", () => {
    const play = scoreRubber([
      {
        declarer: "EW",
        contract: { level: 4, strain: "hearts", doubles: 0 },
        tricks: 10,
      },
      {
        declarer: "EW",
        contract: { level: 4, strain: "spades", doubles: 0 },
        tricks: 10,
      },
    ])
    assert.equal(play.completed, true)
    assert.ok(sidePoints(play, "EW") >= 700) // two games + fast rubber
    const rubber = play.games
      .flatMap((g) => g.sides.EW.above)
      .find((b) => b.title === "Rubber Bonus")
    assert.equal(rubber?.points, 700)
  })

  it("rebuilds play from deal history", () => {
    const history = [
      {
        declarer: 0,
        side: "NS" as const,
        level: 2,
        strain: "notrump" as const,
        doubles: 0 as const,
        tricks: 9,
        net: 0,
      },
    ]
    const play = playFromHistory(history)
    assert.equal(dealNetPoints(play, 0, "NS"), 100)
  })
})
