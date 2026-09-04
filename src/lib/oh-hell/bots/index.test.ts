import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createGame,
  joinGame,
  makeBot,
  placeBid,
  playCard,
  removeBot,
  startGame,
  wouldBeLegalPlay,
} from "../engine"
import type { OhHellSettings as GameSettings } from "../types"
import { chooseBid, choosePlay, shouldRunBotController } from "./index"

const settings: GameSettings = {
  kind: "oh-hell",
  seatCount: 3,
  pattern: [3, 2, 1],
  leadTrump: "after-broken",
  hook: false,
  scoring: { made: "10 + t", miss: "t" },
}

describe("bot helpers", () => {
  it("adds and removes bots in the lobby", () => {
    let state = createGame(settings)
    state = joinGame(state, "human", "Ada")
    state = makeBot(state, 1)
    assert.equal(state.seats[1].isBot, true)
    assert.match(state.seats[1].playerId ?? "", /^bot:1$/)
    state = makeBot(state, 2)
    assert.equal(filled(state), 3)
    state = removeBot(state, 1)
    assert.equal(state.seats[1].playerId, null)
    assert.equal(state.seats[1].isBot, false)
  })

  it("picks legal bids and plays", () => {
    let state = createGame(settings)
    state = joinGame(state, "human", "Ada")
    state = makeBot(state, 1)
    state = makeBot(state, 2)
    state = startGame(state)
    while (state.phase === "bidding" && state.currentSeat !== null) {
      const seat = state.currentSeat
      const bid = chooseBid(state, seat)
      state = placeBid(state, seat, bid)
    }
    assert.equal(state.phase, "playing")

    const seat = state.currentSeat!
    const card = choosePlay(state, seat)
    assert.equal(wouldBeLegalPlay(state, seat, card), true)
    state = playCard(state, seat, card)
    assert.equal(state.currentTrick.length, 1)
  })

  it("runs the controller from the lowest human seat", () => {
    let state = createGame(settings)
    state = joinGame(state, "human", "Ada")
    state = makeBot(state, 1)
    state = makeBot(state, 2)
    assert.equal(shouldRunBotController(state, 0), true)
    assert.equal(shouldRunBotController(state, 1), false)
    assert.equal(
      shouldRunBotController(state, null, {
        playerId: "spectator",
        onlineIds: ["spectator"],
      }),
      false
    )
  })

  it("lets a spectator run bots when no humans are seated", () => {
    let state = createGame(settings)
    state = makeBot(state, 0)
    state = makeBot(state, 1)
    state = makeBot(state, 2)
    assert.equal(
      shouldRunBotController(state, null, {
        playerId: "spec-a",
        onlineIds: ["spec-b", "spec-a"],
      }),
      true
    )
    assert.equal(
      shouldRunBotController(state, null, {
        playerId: "spec-b",
        onlineIds: ["spec-b", "spec-a"],
      }),
      false
    )
  })
})

function filled(state: ReturnType<typeof createGame>) {
  return state.seats.filter((seat) => seat.playerId).length
}
