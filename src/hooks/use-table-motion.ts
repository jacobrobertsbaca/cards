"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { armAudio, playDeal, playDing, playShuffle } from "@/lib/audio"
import { cardsThisRound, trickWinner } from "@/lib/game/engine"
import type { GameState, TrickPlay } from "@/lib/game/types"
import type { TableSlot } from "@/components/game/player-seat"

export type TrumpPhase = "hidden" | "down" | "flip" | "fly" | "rest"

const TRUMP_ENTER_MS = 160
export const TRUMP_FLIP_MS = 380
const TRUMP_SHOW_MS = 120
const TRUMP_HOLD_MS = 420
const TRUMP_FLY_MS = 480
const TRICK_CLEAR_MS = 420
const POST_CLEAR_PAUSE_MS = 450

const SLOT_OFFSET: Record<TableSlot, { x: string; y: string }> = {
  south: { x: "0vw", y: "38vh" },
  north: { x: "0vw", y: "-36vh" },
  west: { x: "-36vw", y: "0vh" },
  east: { x: "36vw", y: "0vh" },
  "north-left": { x: "-22vw", y: "-30vh" },
  "north-right": { x: "22vw", y: "-30vh" },
}

export function dealOffset(slot: TableSlot) {
  return SLOT_OFFSET[slot]
}

export function exitOffset(slot: TableSlot) {
  const map: Record<TableSlot, { x: string; y: string }> = {
    south: { x: "0vw", y: "55vh" },
    north: { x: "0vw", y: "-55vh" },
    west: { x: "-55vw", y: "0vh" },
    east: { x: "55vw", y: "0vh" },
    "north-left": { x: "-40vw", y: "-50vh" },
    "north-right": { x: "40vw", y: "-50vh" },
  }
  return map[slot]
}

function visibleTrick(state: GameState) {
  if (state.currentTrick.length > 0) return state.currentTrick
  return state.lastTrick ?? []
}

function trickKey(plays: TrickPlay[]) {
  return plays.map((play) => `${play.seat}-${play.card.rank}${play.card.suit}`).join(",")
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function useTableMotion(state: GameState, mySeat: number | null) {
  const prevPhase = useRef(state.phase)
  const shownTrick = useRef<TrickPlay[]>(visibleTrick(state))
  const seen = useRef(state)
  const lastTurn = useRef<string | null>(null)
  const [dealing, setDealing] = useState(false)
  const [shuffling, setShuffling] = useState(false)
  const [revealed, setRevealed] = useState<number[]>(
    state.seats.map((_, index) => state.hands[index]?.length ?? 0)
  )
  const [trumpPhase, setTrumpPhase] = useState<TrumpPhase>(
    state.trump ? "rest" : "hidden"
  )
  const [trick, setTrick] = useState<TrickPlay[]>(visibleTrick(state))
  const [trickLeaving, setTrickLeaving] = useState(false)
  const [trickWinnerSeat, setTrickWinnerSeat] = useState<number | null>(null)
  // Winner of the trick currently on the table. Kept across startRound so the
  // clear animation still aims at the seat that won under the *old* trump.
  const heldWinnerRef = useRef<number | null>(null)

  const enteringDeal =
    state.phase === "bidding" &&
    (prevPhase.current === "lobby" || prevPhase.current === "round-end")

  function rememberWinner(plays: TrickPlay[], trump: GameState["trump"]) {
    if (plays.length === 0) {
      heldWinnerRef.current = null
      return null
    }
    const winner = trickWinner(plays, trump)
    heldWinnerRef.current = winner
    return winner
  }

  function clearWinner() {
    heldWinnerRef.current = null
    setTrickWinnerSeat(null)
  }

  useEffect(() => {
    armAudio()
  }, [])

  useEffect(() => {
    const before = seen.current
    seen.current = state
    if (before === state) return

    const bidFromOther = state.bids.some(
      (bid, seat) =>
        bid !== null && before.bids[seat] === null && seat !== mySeat
    )
    if (bidFromOther) playDeal()

    if (state.currentTrick.length > before.currentTrick.length) {
      const play = state.currentTrick[state.currentTrick.length - 1]
      if (play && play.seat !== mySeat) playDeal()
    }
  }, [mySeat, state])

  useLayoutEffect(() => {
    const from = prevPhase.current
    const started =
      state.phase === "bidding" && (from === "lobby" || from === "round-end")

    prevPhase.current = state.phase
    if (!started) return

    const timers: number[] = []
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms))
    }

    const count = state.settings.seatCount
    const cards = cardsThisRound(state)
    const first = (state.dealer + 1) % count
    const queue: number[] = []
    for (let card = 0; card < cards; card++) {
      for (let step = 0; step < count; step++) {
        queue.push((first + step) % count)
      }
    }
    const hasTrump = state.trump !== null
    const fullHands = state.hands.map((hand) => hand.length)
    const fromRoundEnd = from === "round-end"

    setDealing(true)
    setTrumpPhase("hidden")
    setRevealed(state.seats.map(() => 0))

    const held = shownTrick.current.length > 0
    if (held) {
      // Prefer the winner captured while the previous trump was still in force.
      // Recomputing with state.trump here is wrong after startRound replaces it.
      const winner =
        heldWinnerRef.current ??
        trickWinner(
          shownTrick.current,
          from === "round-end"
            ? (state.history.at(-1)?.trump ?? null)
            : state.trump
        )
      heldWinnerRef.current = winner
      setTrickWinnerSeat(winner)
      setTrickLeaving(true)
      later(() => {
        shownTrick.current = []
        setTrick([])
        setTrickLeaving(false)
        clearWinner()
      }, TRICK_CLEAR_MS)
    } else {
      setTrick([])
      setTrickLeaving(false)
      clearWinner()
    }

    const clearAt = held ? TRICK_CLEAR_MS : 0
    const pauseBeforeDeal =
      fromRoundEnd && !prefersReducedMotion() ? POST_CLEAR_PAUSE_MS : 0
    const dealStartAt = clearAt + pauseBeforeDeal
    const finishDeal = (animateTrump: boolean) => {
      setRevealed(fullHands)
      if (!hasTrump) {
        setTrumpPhase("hidden")
        setDealing(false)
        return
      }
      if (!animateTrump) {
        setTrumpPhase("rest")
        setDealing(false)
        return
      }
      setTrumpPhase("down")
      later(() => {
        setTrumpPhase("flip")
        playDeal()
      }, TRUMP_ENTER_MS + TRUMP_SHOW_MS)
      later(() => {
        setTrumpPhase("fly")
        setDealing(false)
      }, TRUMP_ENTER_MS + TRUMP_SHOW_MS + TRUMP_FLIP_MS + TRUMP_HOLD_MS)
      later(
        () => setTrumpPhase("rest"),
        TRUMP_ENTER_MS + TRUMP_SHOW_MS + TRUMP_FLIP_MS + TRUMP_HOLD_MS + TRUMP_FLY_MS
      )
    }

    if (prefersReducedMotion()) {
      later(() => {
        playShuffle()
        finishDeal(false)
      }, dealStartAt)
      return () => timers.forEach((timer) => window.clearTimeout(timer))
    }

    later(() => {
      setShuffling(true)
      playShuffle()
    }, dealStartAt)
    later(() => setShuffling(false), dealStartAt + 520)

    const budget = 2800
    const flightMs = 380
    const minStagger = Math.ceil(flightMs / Math.max(count, 1))
    const stagger = Math.max(
      minStagger,
      Math.min(100, budget / Math.max(queue.length, 1))
    )

    queue.forEach((seat, index) => {
      later(() => {
        playDeal()
        setRevealed((current) =>
          current.map((value, seatIndex) =>
            seatIndex === seat ? value + 1 : value
          )
        )
      }, dealStartAt + 520 + index * stagger)
    })

    later(
      () => finishDeal(true),
      dealStartAt + 520 + queue.length * stagger + flightMs + 60
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [mySeat, state.dealer, state.phase, state.roundIndex, state.settings.seatCount])

  const plays = visibleTrick(state)
  const live = state.currentTrick.length > 0
  const trickSig = `${live ? "live" : "done"}:${trickKey(plays)}:${state.phase}`

  useEffect(() => {
    if (plays.length === 0) return

    const holding =
      state.phase === "trick-end" ||
      state.phase === "round-end" ||
      state.phase === "game-over"
    if (holding) {
      shownTrick.current = plays
      setTrick(plays)
      setTrickLeaving(false)
      setTrickWinnerSeat(rememberWinner(plays, state.trump))
      return
    }

    const sitting = shownTrick.current
    const collect = !live && sitting.length > 0
    const newLead = live && plays.length === 1 && sitting.length > 1
    if ((collect || newLead) && !prefersReducedMotion()) {
      setTrickWinnerSeat(rememberWinner(sitting, state.trump))
      setTrickLeaving(true)
      const timer = window.setTimeout(() => {
        shownTrick.current = newLead ? plays : []
        setTrick(newLead ? plays : [])
        setTrickLeaving(false)
        clearWinner()
      }, 420)
      return () => window.clearTimeout(timer)
    }

    shownTrick.current = live ? plays : []
    setTrick(live ? plays : [])
    setTrickLeaving(false)
    clearWinner()
  }, [trickSig]) // eslint-disable-line react-hooks/exhaustive-deps

  const turnKey =
    state.phase === "playing" && state.currentSeat !== null && !dealing
      ? `${state.roundIndex}-${state.currentTrick.length}-${state.currentSeat}`
      : null

  useEffect(() => {
    if (!turnKey || mySeat === null) return
    if (state.currentSeat !== mySeat) return
    if (lastTurn.current === turnKey) return
    lastTurn.current = turnKey
    playDing()
  }, [mySeat, state.currentSeat, turnKey])

  return {
    dealing,
    shuffling,
    revealed,
    trumpPhase,
    trick,
    trickLeaving,
    trickWinnerSeat,
    enteringDeal,
  }
}

export type TableMotion = ReturnType<typeof useTableMotion>
