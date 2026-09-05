import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { canControlSeat } from "@/lib/game/view"
import {
  actingSeatFor,
  createBridgeGame,
  joinBridgeGame,
  legalBridgeCalls,
  makeBridgeBot,
  placeBridgeCall,
  playBridgeCard,
  startBridgeGame,
  continueBridgeTrick,
} from "./engine"
import { chooseBridgeCall, chooseBridgePlay } from "./bots"

describe("bridge engine", () => {
  it("runs an auction to a contract", () => {
    let state = createBridgeGame()
    for (let seat = 0; seat < 4; seat++) {
      state = makeBridgeBot(state, seat)
    }
    state = startBridgeGame(state)
    assert.equal(state.phase, "bidding")
    assert.equal(state.hands[0].length, 13)
    assert.equal(state.currentSeat, state.dealer)

    // Dealer opens 1NT, then three passes
    const dealer = state.dealer
    state = placeBridgeCall(state, dealer, {
      type: "bid",
      level: 1,
      strain: "notrump",
    })
    for (let i = 0; i < 3; i++) {
      const seat = state.currentSeat!
      state = placeBridgeCall(state, seat, { type: "pass" })
    }
    assert.equal(state.phase, "playing")
    assert.ok(state.contract)
    assert.equal(state.contract.level, 1)
    assert.equal(state.contract.strain, "notrump")
    assert.equal(state.contract.declarer, dealer)
  })

  it("redeals and bumps dealIndex after four opening passes", () => {
    let state = createBridgeGame()
    for (let seat = 0; seat < 4; seat++) state = makeBridgeBot(state, seat)
    state = startBridgeGame(state)

    const dealer = state.dealer
    const dealIndex = state.dealIndex
    const firstHand = state.hands[0].map((card) => `${card.rank}${card.suit}`).join(",")

    for (let i = 0; i < 4; i++) {
      const seat = state.currentSeat!
      state = placeBridgeCall(state, seat, { type: "pass" })
    }

    assert.equal(state.phase, "bidding")
    assert.equal(state.auction.length, 0)
    assert.equal(state.dealIndex, dealIndex + 1)
    assert.equal(state.dealer, (dealer + 1) % 4)
    assert.equal(state.currentSeat, state.dealer)
    assert.equal(state.hands[0].length, 13)
    assert.notEqual(
      state.hands[0].map((card) => `${card.rank}${card.suit}`).join(","),
      firstHand
    )
  })

  it("lists legal calls including pass", () => {
    let state = createBridgeGame()
    state = joinBridgeGame(state, "a", "A")
    for (let seat = 1; seat < 4; seat++) state = makeBridgeBot(state, seat)
    state = startBridgeGame(state)
    const seat = state.currentSeat!
    const calls = legalBridgeCalls(state, seat)
    assert.ok(calls.some((c) => c.type === "pass"))
    assert.ok(calls.some((c) => c.type === "bid" && c.level === 1))
  })

  it("declarer — not dummy — plays from dummy after the opening lead", () => {
    let state = createBridgeGame()
    for (let seat = 0; seat < 4; seat++) state = makeBridgeBot(state, seat)
    state = startBridgeGame(state)

    const first = state.currentSeat!
    state = placeBridgeCall(state, first, {
      type: "bid",
      level: 1,
      strain: "notrump",
    })
    for (let i = 0; i < 3; i++) {
      state = placeBridgeCall(state, state.currentSeat!, { type: "pass" })
    }
    assert.equal(state.phase, "playing")
    assert.ok(state.contract)

    const { declarer, dummy } = state.contract
    const leader = state.currentSeat!
    assert.notEqual(leader, dummy)

    const lead = chooseBridgePlay(state, leader)
    state = playBridgeCard(state, leader, lead)
    assert.equal(state.openingLeadDone, true)
    assert.equal(state.currentSeat, dummy)

    assert.equal(actingSeatFor(state, dummy), null)
    assert.equal(actingSeatFor(state, declarer), dummy)
    assert.equal(canControlSeat(state, dummy, dummy), false)
    assert.equal(canControlSeat(state, declarer, dummy), true)
    assert.equal(canControlSeat(state, declarer, declarer), true)

    const fromDummy = chooseBridgePlay(state, declarer)
    assert.ok(
      state.hands[dummy].some(
        (c) => c.suit === fromDummy.suit && c.rank === fromDummy.rank
      )
    )
    assert.throws(() => playBridgeCard(state, dummy, fromDummy))
    state = playBridgeCard(state, declarer, fromDummy)
    assert.equal(state.hands[dummy].length, 12)
  })

  it("bots can bid and play a full deal", () => {
    let state = createBridgeGame()
    for (let seat = 0; seat < 4; seat++) state = makeBridgeBot(state, seat)
    state = startBridgeGame(state)

    let guard = 0
    while (state.phase === "bidding" && guard++ < 40) {
      const seat = state.currentSeat!
      state = placeBridgeCall(state, seat, chooseBridgeCall(state, seat))
    }
    if (state.phase === "bidding") {
      // rare passout redeal
      assert.ok(true)
      return
    }
    assert.equal(state.phase, "playing")

    guard = 0
    while (
      (state.phase === "playing" || state.phase === "trick-end") &&
      guard++ < 80
    ) {
      if (state.phase === "trick-end") {
        state = continueBridgeTrick(state)
        continue
      }
      const seat = state.currentSeat!
      const actor =
        state.contract &&
        state.openingLeadDone &&
        seat === state.contract.dummy
          ? state.contract.declarer
          : seat
      const card = chooseBridgePlay(state, actor)
      state = playBridgeCard(state, actor, card)
    }
    assert.ok(state.phase === "round-end" || state.phase === "game-over")
    assert.equal(state.history.length, 1)
  })
})
