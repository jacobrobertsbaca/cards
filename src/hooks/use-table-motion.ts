"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { armAudio, playDeal, playDing, playShuffle } from "@/lib/audio"
import { cardsThisRound, trickWinner } from "@/lib/game/engine"
import type { GameState, TrickPlay } from "@/lib/game/types"
import type { TableSlot } from "@/components/game/player-seat"
import { DEAL_FLIGHT_MS } from "@/components/game/deal-in"

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

function handCounts(state: GameState) {
  return state.hands.map((hand) => hand.length)
}

function buildDealDelays(queue: number[], seatCount: number, stagger: number) {
  const delays = Array.from({ length: seatCount }, () => [] as number[])
  const seen = Array.from({ length: seatCount }, () => 0)
  queue.forEach((seat, index) => {
    delays[seat][seen[seat]] = index * stagger
    seen[seat] += 1
  })
  return delays
}

export function useTableMotion(state: GameState, mySeat: number | null) {
  const prevPhase = useRef(state.phase)
  const shownTrick = useRef<TrickPlay[]>(visibleTrick(state))
  const seen = useRef(state)
  const lastTurn = useRef<string | null>(null)
  // Round whose deal animation has finished (or was skipped on late join).
  // Null means the next bidding phase should animate a deal. Reset on cleanup
  // if the animation was interrupted so Strict Mode / remounts can retry.
  const dealtRoundRef = useRef<number | null>(
    state.phase === "lobby" || state.phase === "round-end"
      ? null
      : state.roundIndex
  )
  const [dealing, setDealing] = useState(false)
  const [shuffling, setShuffling] = useState(false)
  const [revealed, setRevealed] = useState<number[]>(handCounts(state))
  const [dealDelays, setDealDelays] = useState<number[][] | null>(null)
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
    !dealing &&
    dealtRoundRef.current !== state.roundIndex

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
    if (state.phase === "lobby") {
      dealtRoundRef.current = null
      prevPhase.current = state.phase
      return
    }

    const from = prevPhase.current
    const fromRoundEnd = from === "round-end"
    prevPhase.current = state.phase

    const shouldAnimateDeal =
      state.phase === "bidding" && dealtRoundRef.current !== state.roundIndex

    if (!shouldAnimateDeal) {
      // Deal timers were cleared (or never started) while `dealing` was still
      // true — snap hands to the real counts so seats are never left short.
      setDealing(false)
      setShuffling(false)
      setDealDelays(null)
      setRevealed(handCounts(state))
      if (state.phase !== "bidding" || dealtRoundRef.current === state.roundIndex) {
        setTrumpPhase(state.trump ? "rest" : "hidden")
      }
      return
    }

    dealtRoundRef.current = state.roundIndex
    let finished = false
    const timers: number[] = []
    let cancelled = false
    const after = (fn: () => void, ms: number) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) fn()
        }, ms)
      )
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
    const fullHands = handCounts(state)

    setDealing(true)
    setTrumpPhase("hidden")
    setRevealed(state.seats.map(() => 0))
    setDealDelays(null)

    const held = shownTrick.current.length > 0
    if (held) {
      // Prefer the winner captured while the previous trump was still in force.
      // Recomputing with state.trump here is wrong after startRound replaces it.
      const winner =
        heldWinnerRef.current ??
        trickWinner(
          shownTrick.current,
          fromRoundEnd
            ? (state.history.at(-1)?.trump ?? null)
            : state.trump
        )
      heldWinnerRef.current = winner
      setTrickWinnerSeat(winner)
      setTrickLeaving(true)
      after(() => {
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
      finished = true
      setRevealed(fullHands)
      if (!hasTrump) {
        setTrumpPhase("hidden")
        setDealing(false)
        setDealDelays(null)
        return
      }
      if (!animateTrump) {
        setTrumpPhase("rest")
        setDealing(false)
        setDealDelays(null)
        return
      }
      setTrumpPhase("down")
      after(() => {
        setTrumpPhase("flip")
        playDeal()
      }, TRUMP_ENTER_MS + TRUMP_SHOW_MS)
      after(() => {
        setTrumpPhase("fly")
        setDealing(false)
        setDealDelays(null)
      }, TRUMP_ENTER_MS + TRUMP_SHOW_MS + TRUMP_FLIP_MS + TRUMP_HOLD_MS)
      after(
        () => setTrumpPhase("rest"),
        TRUMP_ENTER_MS + TRUMP_SHOW_MS + TRUMP_FLIP_MS + TRUMP_HOLD_MS + TRUMP_FLY_MS
      )
    }

    if (prefersReducedMotion()) {
      after(() => {
        playShuffle()
        finishDeal(false)
      }, dealStartAt)
      return () => {
        cancelled = true
        timers.forEach((timer) => window.clearTimeout(timer))
        if (!finished) dealtRoundRef.current = null
      }
    }

    // Scale stagger with hand size: large deals overlap more instead of
    // rushing individual flights or dragging on forever.
    const totalCards = Math.max(queue.length, 1)
    const dealBudgetMs = Math.min(4600, Math.max(1600, totalCards * 55))
    const stagger = Math.max(26, Math.min(78, dealBudgetMs / totalCards))
    const delays = buildDealDelays(queue, count, stagger)
    const lastDelay = (totalCards - 1) * stagger
    const soundEvery = Math.max(1, Math.round(48 / stagger))

    after(() => {
      setShuffling(true)
      playShuffle()
    }, dealStartAt)
    after(() => {
      setShuffling(false)
      // Mount the full fan once so seats don't reflow as cards arrive —
      // Motion handles staggered fly-ins from the table center.
      setDealDelays(delays)
      setRevealed(fullHands)
      playDeal()
    }, dealStartAt + 520)

    for (let index = soundEvery; index < totalCards; index += soundEvery) {
      after(() => playDeal(), dealStartAt + 520 + index * stagger)
    }

    after(
      () => finishDeal(true),
      dealStartAt + 520 + lastDelay + DEAL_FLIGHT_MS + 80
    )

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      // Allow a remount/restart (Strict Mode) to animate this round again.
      if (!finished) dealtRoundRef.current = null
    }
  }, [state.phase, state.roundIndex, state.dealer, state.settings.seatCount])

  // Keep revealed counts honest whenever we are not mid-deal (e.g. cards
  // played, or a deal that finished without every incremental tick firing).
  useEffect(() => {
    if (dealing || enteringDeal) return
    if (state.phase === "lobby") return
    const full = handCounts(state)
    setRevealed((current) =>
      current.length === full.length &&
      current.every((value, index) => value === full[index])
        ? current
        : full
    )
  }, [dealing, enteringDeal, state.phase, state.hands, state.roundIndex])

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
    dealDelays,
    trumpPhase,
    trick,
    trickLeaving,
    trickWinnerSeat,
    enteringDeal,
  }
}

export type TableMotion = ReturnType<typeof useTableMotion>
