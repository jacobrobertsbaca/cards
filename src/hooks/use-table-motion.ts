"use client"

import { useEffect, useRef, useState } from "react"
import { playDeal, playDing, playShuffle, unlockAudio } from "@/lib/audio"
import { cardsThisRound, trickWinner } from "@/lib/game/engine"
import type { GameState, TrickPlay } from "@/lib/game/types"
import { slotFor, type TableSlot } from "@/components/game/player-seat"

export type DealFlight = {
  id: number
  slot: TableSlot | "trump"
}

const SLOT_OFFSET: Record<TableSlot | "trump", { x: string; y: string }> = {
  south: { x: "0vw", y: "38vh" },
  north: { x: "0vw", y: "-36vh" },
  west: { x: "-36vw", y: "0vh" },
  east: { x: "36vw", y: "0vh" },
  "north-left": { x: "-22vw", y: "-30vh" },
  "north-right": { x: "22vw", y: "-30vh" },
  trump: { x: "-40vw", y: "38vh" },
}

export function dealOffset(slot: TableSlot | "trump") {
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
  const flightId = useRef(0)
  const shownTrick = useRef<TrickPlay[]>(visibleTrick(state))
  const lastCardKey = useRef<string | null>(null)
  const lastTurn = useRef<string | null>(null)
  const [dealing, setDealing] = useState(false)
  const [shuffling, setShuffling] = useState(false)
  const [revealed, setRevealed] = useState<number[]>(
    state.seats.map((_, index) => state.hands[index]?.length ?? 0)
  )
  const [flights, setFlights] = useState<DealFlight[]>([])
  const [trumpReady, setTrumpReady] = useState(state.trump !== null)
  const [trick, setTrick] = useState<TrickPlay[]>(visibleTrick(state))
  const [trickLeaving, setTrickLeaving] = useState(false)
  const [trickWinnerSeat, setTrickWinnerSeat] = useState<number | null>(null)

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener("pointerdown", unlock, { once: true })
    return () => window.removeEventListener("pointerdown", unlock)
  }, [])

  useEffect(() => {
    const from = prevPhase.current
    prevPhase.current = state.phase
    const started =
      state.phase === "bidding" && (from === "lobby" || from === "round-end")
    if (!started) return

    const count = state.settings.seatCount
    const cards = cardsThisRound(state)
    const first = (state.dealer + 1) % count
    const queue: Array<{ seat?: number; trump?: boolean }> = []
    for (let card = 0; card < cards; card++) {
      for (let step = 0; step < count; step++) {
        queue.push({ seat: (first + step) % count })
      }
    }
    if (state.trump) queue.push({ trump: true })

    const fullHands = state.hands.map((hand) => hand.length)
    setDealing(true)
    setTrumpReady(false)
    setRevealed(state.seats.map(() => 0))
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms))
    }

    const held = shownTrick.current.length > 0
    if (held) {
      setTrickWinnerSeat(trickWinner(shownTrick.current, state.trump))
      setTrickLeaving(true)
      later(() => {
        shownTrick.current = []
        setTrick([])
        setTrickLeaving(false)
        setTrickWinnerSeat(null)
      }, 420)
    } else {
      setTrick([])
      setTrickLeaving(false)
    }

    const startAt = held ? 420 : 0

    if (prefersReducedMotion()) {
      later(() => {
        playShuffle()
        setRevealed(fullHands)
        setTrumpReady(true)
        setDealing(false)
      }, startAt)
      return () => timers.forEach((timer) => window.clearTimeout(timer))
    }

    later(() => {
      setShuffling(true)
      playShuffle()
    }, startAt)
    later(() => setShuffling(false), startAt + 520)

    const budget = 2200
    const stagger = Math.max(48, Math.min(90, budget / Math.max(queue.length, 1)))
    const flightMs = 240

    queue.forEach((item, index) => {
      later(() => {
        const slot: TableSlot | "trump" = item.trump
          ? "trump"
          : slotFor(count, ((item.seat ?? 0) - (mySeat ?? 0) + count) % count)
        const id = ++flightId.current
        setFlights((current) => [...current, { id, slot }])
        playDeal()
        later(() => {
          setFlights((current) => current.filter((flight) => flight.id !== id))
          if (item.trump) setTrumpReady(true)
          else if (item.seat !== undefined) {
            setRevealed((current) =>
              current.map((value, seat) => (seat === item.seat ? value + 1 : value))
            )
          }
        }, flightMs)
      }, startAt + 520 + index * stagger)
    })

    later(() => {
      setRevealed(fullHands)
      setTrumpReady(true)
      setDealing(false)
      setFlights([])
    }, startAt + 520 + queue.length * stagger + flightMs + 40)

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [mySeat, state.dealer, state.phase, state.roundIndex, state.settings.seatCount])

  const plays = visibleTrick(state)
  const live = state.currentTrick.length > 0
  const trickSig = `${live ? "live" : "done"}:${trickKey(plays)}:${state.phase}`

  useEffect(() => {
    const newest = plays.length ? trickKey([plays[plays.length - 1]]) : ""
    if (lastCardKey.current === null) {
      lastCardKey.current = newest
    } else if (newest && newest !== lastCardKey.current) {
      playDeal()
    }
    lastCardKey.current = newest

    if (plays.length === 0) return

    const holding =
      state.phase === "trick-end" ||
      state.phase === "round-end" ||
      state.phase === "game-over"
    if (holding) {
      shownTrick.current = plays
      setTrick(plays)
      setTrickLeaving(false)
      setTrickWinnerSeat(
        state.phase === "trick-end" ? trickWinner(plays, state.trump) : null
      )
      return
    }

    const sitting = shownTrick.current
    const collect = !live && sitting.length > 0
    const newLead = live && plays.length === 1 && sitting.length > 1
    if ((collect || newLead) && !prefersReducedMotion()) {
      setTrickWinnerSeat(trickWinner(sitting, state.trump))
      setTrickLeaving(true)
      const timer = window.setTimeout(() => {
        shownTrick.current = newLead ? plays : []
        setTrick(newLead ? plays : [])
        setTrickLeaving(false)
        setTrickWinnerSeat(null)
      }, 420)
      return () => window.clearTimeout(timer)
    }

    shownTrick.current = live ? plays : []
    setTrick(live ? plays : [])
    setTrickLeaving(false)
    setTrickWinnerSeat(null)
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
    flights,
    trumpReady,
    trick,
    trickLeaving,
    trickWinnerSeat,
  }
}

export type TableMotion = ReturnType<typeof useTableMotion>
