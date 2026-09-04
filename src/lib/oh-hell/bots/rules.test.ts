import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createGame,
  forbiddenDealerBid,
  joinGame,
  legalBids,
  placeBid,
  startGame,
  wouldBeLegalPlay,
} from "../engine"
import type { OhHellSettings as GameSettings } from "../types"
import { chooseBid, choosePlay } from "./index"
import { TRAINED_BOT_PARAMS } from "./params"
import { resetSearchBudget, setSearchBudget } from "./search"
import {
  TRAINING_SETTINGS,
  defaultSettings,
  makeParamBot,
  runSimulation,
} from "./sim"

const bot = makeParamBot(TRAINED_BOT_PARAMS)

describe("bot rule compliance", () => {
  it("never bids the hooked dealer total", () => {
    setSearchBudget({ bidSamples: 20, deepBidSamples: 8, playSamples: 12 })
    try {
      const settings: GameSettings = {
        ...defaultSettings(),
        seatCount: 3,
        pattern: [2, 3, 4],
        hook: true,
      }

      for (let trial = 0; trial < 80; trial++) {
        let state = createGame(settings)
        for (let seat = 0; seat < settings.seatCount; seat++) {
          state = joinGame(state, `p${seat}`, `Player ${seat + 1}`)
        }
        state = startGame(state)

        while (state.phase === "bidding" && state.currentSeat !== null) {
          const seat = state.currentSeat
          const bid = chooseBid(state, seat)
          const legal = legalBids(state, seat)
          assert.ok(legal.includes(bid), `illegal bid ${bid} for seat ${seat}`)
          const forbidden = forbiddenDealerBid(state)
          if (forbidden !== null && seat === state.dealer) {
            assert.notEqual(
              bid,
              forbidden,
              `dealer bid ${bid} matched hooked total ${forbidden}`
            )
          }
          state = placeBid(state, seat, bid)
        }
      }
    } finally {
      resetSearchBudget()
    }
  })

  it("only chooses legal bids and plays across mixed table sizes", () => {
    for (const settings of TRAINING_SETTINGS) {
      for (let game = 0; game < 40; game++) {
        const brains = Array.from({ length: settings.seatCount }, () => bot)
        const state = runSimulation(brains, settings)
        assert.equal(state.phase, "game-over")
      }
    }
  })

  it("never leads trump before it is broken when required", () => {
    setSearchBudget({ bidSamples: 16, deepBidSamples: 6, playSamples: 12 })
    try {
      const settings: GameSettings = {
        ...defaultSettings(),
        seatCount: 2,
        pattern: [5],
        leadTrump: "after-broken",
        hook: true,
      }

      for (let game = 0; game < 60; game++) {
        let state = createGame(settings)
        state = joinGame(state, "a", "Ada")
        state = joinGame(state, "b", "Bea")
        state = startGame(state)

        while (state.phase === "bidding" && state.currentSeat !== null) {
          const seat = state.currentSeat
          state = placeBid(state, seat, chooseBid(state, seat))
        }

        while (state.phase === "playing" || state.phase === "trick-end") {
          if (state.phase !== "playing" || state.currentSeat === null) break
          if (
            state.currentTrick.length === 0 &&
            state.trump &&
            !state.trumpBroken
          ) {
            const seat = state.currentSeat
            const card = choosePlay(state, seat)
            assert.equal(wouldBeLegalPlay(state, seat, card), true)
            const hasNonTrump = state.hands[seat].some(
              (item) => item.suit !== state.trump!.suit
            )
            if (hasNonTrump) {
              assert.notEqual(
                card.suit,
                state.trump.suit,
                "bot led trump before trump was broken"
              )
            }
          }
          break
        }
      }
    } finally {
      resetSearchBudget()
    }
  })
})
