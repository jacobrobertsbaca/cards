import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createBridgeGame,
  joinBridgeGame,
  makeBridgeBot,
  placeBridgeCall,
  startBridgeGame,
} from "@/lib/bridge/engine"
import { applyScheduledBotTurn, isBotTurn } from "./bot-turn"
import {
  createGame,
  joinGame,
  makeBot,
  placeBid,
  startGame,
} from "@/lib/oh-hell/engine"
import type { OhHellSettings } from "@/lib/oh-hell/types"

const ohHellSettings: OhHellSettings = {
  kind: "oh-hell",
  seatCount: 3,
  pattern: [3, 2, 1],
  leadTrump: "after-broken",
  hook: false,
  scoring: { made: "10 + t", miss: "t" },
}

describe("applyScheduledBotTurn", () => {
  it("no-ops when the expected seat is no longer to act (bridge)", () => {
    let state = createBridgeGame()
    state = joinBridgeGame(state, "human", "Ada")
    state = makeBridgeBot(state, 1)
    state = makeBridgeBot(state, 2)
    state = makeBridgeBot(state, 3)
    state = startBridgeGame(state)

    const first = state.currentSeat!
    assert.equal(isBotTurn(state), first !== 0)

    if (first === 0) {
      state = placeBridgeCall(state, 0, { type: "pass" })
    } else {
      const applied = applyScheduledBotTurn(state, first)
      state = applied.state as typeof state
    }

    const next = state.currentSeat!
    const stale = applyScheduledBotTurn(state, first)
    assert.equal(stale.state, state)
    assert.equal(stale.bridgeCall, undefined)

    const fresh = applyScheduledBotTurn(state, next)
    if (isBotTurn(state)) {
      assert.notEqual(fresh.state, state)
      assert.equal(
        (fresh.state as typeof state).auction.length,
        state.auction.length + 1
      )
    }
  })

  it("does not apply a bot bid for a later seat after the turn advanced (oh hell)", () => {
    let state = createGame(ohHellSettings)
    state = joinGame(state, "human", "Ada")
    state = makeBot(state, 1)
    state = makeBot(state, 2)
    state = startGame(state)

    while (state.currentSeat === 0 && state.phase === "bidding") {
      state = placeBid(state, 0, 0)
    }
    assert.equal(state.phase, "bidding")
    const botSeat = state.currentSeat!
    assert.equal(isBotTurn(state), true)

    const moved = applyScheduledBotTurn(state, botSeat)
    assert.notEqual(moved.state, state)
    assert.ok(moved.ohHellBid)

    const after = moved.state as typeof state
    const replay = applyScheduledBotTurn(after, botSeat)
    assert.equal(replay.state, after)
    assert.equal(replay.ohHellBid, undefined)
  })

  it("keeps auction seat order when simulating conflict retries", () => {
    let state = createBridgeGame()
    state = joinBridgeGame(state, "human", "Ada")
    state = makeBridgeBot(state, 1)
    state = makeBridgeBot(state, 2)
    state = makeBridgeBot(state, 3)
    state = startBridgeGame(state)

    const seats: number[] = []
    let guard = 0
    while (state.phase === "bidding" && guard++ < 40) {
      const seat = state.currentSeat!
      if (seat === 0) {
        state = placeBridgeCall(state, 0, { type: "pass" })
        seats.push(0)
        continue
      }
      // Simulate a stale retry for the previous seat before taking the real turn.
      if (seats.length > 0) {
        const stale = applyScheduledBotTurn(state, seats[seats.length - 1]!)
        assert.equal(stale.state, state)
      }
      const result = applyScheduledBotTurn(state, seat)
      assert.ok(result.bridgeCall)
      assert.equal(result.bridgeCall.seat.index, seat)
      seats.push(seat)
      state = result.state as typeof state
    }

    assert.ok(seats.length >= 4)
    for (let i = 1; i < seats.length; i++) {
      assert.equal(seats[i], (seats[i - 1]! + 1) % 4)
    }
  })
})
