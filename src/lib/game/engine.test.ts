import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_FORMULA } from "./types"
import {
  continueTrick,
  createGame,
  joinGame,
  legalBids,
  makeBot,
  placeBid,
  playCard,
  removeBot,
  isLegalPlay,
  wouldBeLegalPlay,
  renameGame,
  startGame,
  swapSeats,
} from "./engine"
import { evaluateFormula } from "./formula"
import type { GameSettings } from "./types"

function settings(overrides: Partial<GameSettings> = {}): GameSettings {
  return {
    kind: "oh-hell",
    seatCount: 3,
    pattern: [1, 2],
    leadTrump: "after-broken",
    hook: true,
    scoring: DEFAULT_FORMULA,
    ...overrides,
  }
}

describe("scoring formula", () => {
  it("scores a made bid as 10 + t", () => {
    assert.equal(evaluateFormula(DEFAULT_FORMULA, 3, 3), 13)
    assert.equal(evaluateFormula(DEFAULT_FORMULA, 0, 0), 10)
  })

  it("scores a miss as tricks taken", () => {
    assert.equal(evaluateFormula(DEFAULT_FORMULA, 3, 1), 1)
  })
})

describe("oh hell", () => {
  it("stays in lobby until the game is started", () => {
    let state = createGame(settings())
    state = joinGame(state, "a", "Ada")
    state = joinGame(state, "b", "Bea")
    assert.equal(state.phase, "lobby")
    state = joinGame(state, "c", "Cal")
    assert.equal(state.phase, "lobby")
    state = startGame(state)
    assert.equal(state.phase, "bidding")
    assert.equal(state.hands.every((hand) => hand.length === 1), true)
    assert.ok(state.trump)
  })

  it("fills empty seats with bots before start", () => {
    let state = createGame(settings())
    state = joinGame(state, "a", "Ada")
    state = makeBot(state, 1)
    state = makeBot(state, 2)
    assert.equal(state.seats[1].isBot, true)
    assert.equal(state.seats[2].isBot, true)
    state = removeBot(state, 1)
    assert.equal(state.seats[1].playerId, null)
    state = makeBot(state, 1)
    state = startGame(state)
    assert.equal(state.phase, "bidding")
  })

  it("swaps seated players in the lobby", () => {
    let state = createGame(settings())
    state = joinGame(state, "a", "Ada")
    state = joinGame(state, "b", "Bea")
    state = makeBot(state, 2)
    state = swapSeats(state, "a", 1)
    assert.equal(state.seats[0].playerId, "b")
    assert.equal(state.seats[1].playerId, "a")
    assert.equal(state.seats[2].isBot, true)
    assert.match(state.seats[2].playerId ?? "", /^bot:2$/)
    state = swapSeats(state, "a", 2)
    assert.equal(state.seats[1].isBot, true)
    assert.match(state.seats[1].playerId ?? "", /^bot:1$/)
    assert.equal(state.seats[2].playerId, "a")
    assert.equal(state.seats[2].isBot, false)
  })

  it("moves a player into an empty seat in the lobby", () => {
    let state = createGame(settings())
    state = joinGame(state, "a", "Ada")
    state = swapSeats(state, "a", 2)
    assert.equal(state.seats[0].playerId, null)
    assert.equal(state.seats[2].playerId, "a")
    assert.equal(state.seats[2].displayName, "Ada")
  })

  it("hooks the dealer off the exact total", () => {
    let state = createGame(settings({ pattern: [2] }))
    state = joinGame(state, "a", "Ada")
    state = joinGame(state, "b", "Bea")
    state = joinGame(state, "c", "Cal")
    state = startGame(state)
    const first = state.currentSeat!
    state = placeBid(state, first, 1)
    const second = state.currentSeat!
    state = placeBid(state, second, 1)
    const dealerBids = legalBids(state, state.dealer)
    assert.equal(dealerBids.includes(0), false)
    assert.deepEqual(dealerBids, [1, 2])
  })

  it("requires following suit", () => {
    let state = createGame(settings({ seatCount: 2, pattern: [2], hook: false }))
    state = joinGame(state, "a", "Ada")
    state = joinGame(state, "b", "Bea")
    state = startGame(state)
    state = placeBid(state, state.currentSeat!, 0)
    state = placeBid(state, state.currentSeat!, 1)
    const leader = state.currentSeat!
    const led =
      state.hands[leader].find((card) => isLegalPlay(state, leader, card)) ??
      state.hands[leader][0]
    state = playCard(state, leader, led)
    const follower = state.currentSeat!
    const offSuit = state.hands[follower].find((card) => card.suit !== led.suit)
    if (offSuit && state.hands[follower].some((card) => card.suit === led.suit)) {
      assert.equal(isLegalPlay(state, follower, offSuit), false)
      assert.equal(wouldBeLegalPlay(state, follower, offSuit), false)
    }
    const follow = state.hands[follower].find((card) => card.suit === led.suit)
    if (follow) {
      assert.equal(isLegalPlay(state, leader, follow), false)
      assert.equal(wouldBeLegalPlay(state, follower, follow), true)
    }
  })

  it("keeps a completed trick on lastTrick", () => {
    let state = createGame(settings({ seatCount: 2, pattern: [1], hook: false }))
    state = joinGame(state, "a", "Ada")
    state = joinGame(state, "b", "Bea")
    state = startGame(state)
    state = placeBid(state, state.currentSeat!, 0)
    state = placeBid(state, state.currentSeat!, 0)
    const leader = state.currentSeat!
    const led = state.hands[leader][0]
    state = playCard(state, leader, led)
    assert.equal(state.currentTrick.length, 1)
    assert.equal(state.lastTrick.length, 0)
    const follower = state.currentSeat!
    const follow = state.hands[follower][0]
    state = playCard(state, follower, follow)
    assert.equal(state.phase, "game-over")
    assert.equal(state.currentTrick.length, 0)
    assert.equal(state.lastTrick.length, 2)
    assert.deepEqual(
      state.lastTrick.map((play) => play.card),
      [led, follow]
    )
  })

  it("waits for continue before the next trick", () => {
    let state = createGame(settings({ seatCount: 2, pattern: [2], hook: false }))
    state = joinGame(state, "a", "Ada")
    state = joinGame(state, "b", "Bea")
    state = startGame(state)
    state = placeBid(state, state.currentSeat!, 0)
    state = placeBid(state, state.currentSeat!, 1)
    const leadSeat = state.currentSeat!
    const lead =
      state.hands[leadSeat].find((card) => isLegalPlay(state, leadSeat, card)) ??
      state.hands[leadSeat][0]
    state = playCard(state, leadSeat, lead)
    const followSeat = state.currentSeat!
    const follow = state.hands[followSeat].find((card) =>
      isLegalPlay(state, followSeat, card)
    )!
    state = playCard(state, followSeat, follow)
    assert.equal(state.phase, "trick-end")
    const winner = state.trickLeader
    const nextLead = state.hands[winner][0]
    assert.equal(isLegalPlay(state, winner, nextLead), false)
    state = continueTrick(state)
    assert.equal(state.phase, "playing")
    assert.equal(state.currentSeat, winner)
    assert.equal(isLegalPlay(state, winner, nextLead), true)
  })

  it("renames a table", () => {
    const state = createGame(settings())
    assert.match(state.title, /Oh Hell$/)
    assert.equal(renameGame(state, "Friday night").title, "Friday night")
    assert.equal(renameGame(state, "   ").title, state.title)
  })
})
