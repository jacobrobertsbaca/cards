"use client"

import { useEffect, useState, useCallback } from "react"
import { useGame } from "@/hooks/use-game"
import { useContinuePrompt } from "@/hooks/use-continue-prompt"
import { useGameOverPrompt } from "@/hooks/use-game-over-prompt"
import { useJoinPrompt } from "@/hooks/use-join-prompt"
import { useLobbyReadyPrompt } from "@/hooks/use-lobby-ready-prompt"
import { useRoundEndPrompt } from "@/hooks/use-round-end-prompt"
import { useTableMotion } from "@/hooks/use-table-motion"
import {
  GameError,
  continueTrick,
  filledSeats,
  isLegalPlay,
  joinGame,
  placeBid,
  playCard,
  renameGame,
  renameSeat,
  seatForPlayer,
  startGame,
  startRound,
} from "@/lib/game/engine"
import { displayGameTitle } from "@/lib/game/title"
import { rememberGame } from "@/lib/history"
import { gameTooltip } from "@/lib/game/rules"
import { playDeal, unlockAudio } from "@/lib/audio"
import { sameCard } from "@/lib/game/cards"
import type { Card, GameState } from "@/lib/game/types"
import { subscribeIdentity } from "@/lib/identity"
import { GameTable } from "./table"
import { BidPanel } from "./overlays"

export function GameRoom({ code }: { code: string }) {
  const { record, status, error, online, apply, identity } = useGame(code)
  const [spectating, setSpectating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const state = record?.state
  const mySeat = state && identity.id ? seatForPlayer(state, identity.id) : null
  const role = mySeat
    ? "player"
    : spectating || state?.phase === "game-over"
      ? "spectator"
      : "unknown"

  useEffect(() => {
    if (!state || !identity.id) return
    rememberGame({
      code,
      kind: "oh-hell",
      title: displayGameTitle(state.title),
      summary: gameTooltip(state.settings),
      finished: state.phase === "game-over",
    })
  }, [code, identity.id, state])

  useEffect(() => {
    if (!mySeat || !identity.id) return
    return subscribeIdentity((next) => {
      if (!next.name) return
      void apply((current) => {
        const seat = current.seats.find((item) => item.playerId === next.id)
        if (!seat || seat.displayName === next.name) return current
        return renameSeat(current, next.id, next.name)
      }).catch(() => {})
    })
  }, [apply, identity.id, mySeat])

  async function onJoin() {
    unlockAudio()
    setActionError(null)
    try {
      await apply((current) => joinGame(current, identity.id, identity.name))
    } catch (err) {
      setActionError(err instanceof GameError || err instanceof Error ? err.message : "Could not join")
    }
  }

  async function onBid(bid: number) {
    unlockAudio()
    if (mySeat == null) return
    try {
      await apply((current) => placeBid(current, mySeat.index, bid))
      playDeal()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not bid")
    }
  }

  const onPlay = useCallback(async (card: Card) => {
    unlockAudio()
    if (mySeat == null) return false
    try {
      const next = await apply((current) => {
        if (!isLegalPlay(current, mySeat.index, card)) return current
        return playCard(current, mySeat.index, card)
      })
      const stillInHand = next.state.hands[mySeat.index]?.some((item) =>
        sameCard(item, card)
      )
      if (stillInHand) {
        setActionError(null)
        return false
      }
      setActionError(null)
      playDeal()
      return true
    } catch (err) {
      if (err instanceof GameError && err.message === "That card cannot be played") {
        setActionError(null)
        return false
      }
      setActionError(err instanceof Error ? err.message : "Could not play")
      throw err
    }
  }, [apply, mySeat])

  async function onAdvanceTrick() {
    unlockAudio()
    try {
      await apply((current) => continueTrick(current))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not continue")
    }
  }

  async function onContinue() {
    unlockAudio()
    try {
      await apply((current) => startRound(current))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not continue")
    }
  }

  async function onStart() {
    unlockAudio()
    try {
      await apply((current) => startGame(current))
      playDeal()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not start")
    }
  }

  async function onRename(title: string) {
    try {
      await apply((current) => renameGame(current, title))
    } catch {
      // rename is best-effort
    }
  }

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/60">
        Finding game
      </div>
    )
  }

  if (status === "missing") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-white">
        <p className="text-lg font-medium">No table here</p>
        <p className="text-sm text-white/60">That link does not match a game.</p>
      </div>
    )
  }

  if (status === "error" || !state) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-200">
        {error ?? "Something went wrong"}
      </div>
    )
  }

  return (
    <ReadyTable
      code={code}
      state={state}
      mySeatIndex={mySeat?.index ?? null}
      role={role}
      online={online}
      actionError={actionError}
      onJoin={() => void onJoin()}
      onSpectate={() => setSpectating(true)}
      onStart={() => void onStart()}
      onBid={(bid) => void onBid(bid)}
      onPlay={onPlay}
      onAdvanceTrick={() => void onAdvanceTrick()}
      onContinue={() => void onContinue()}
      onRename={(title) => void onRename(title)}
    />
  )
}

function ReadyTable({
  code,
  state,
  mySeatIndex,
  role,
  online,
  actionError,
  onJoin,
  onSpectate,
  onStart,
  onBid,
  onPlay,
  onAdvanceTrick,
  onContinue,
  onRename,
}: {
  code: string
  state: GameState
  mySeatIndex: number | null
  role: "player" | "spectator" | "unknown"
  online: string[]
  actionError: string | null
  onJoin: () => void
  onSpectate: () => void
  onStart: () => void
  onBid: (bid: number) => void
  onPlay: (card: Card) => void | Promise<void | boolean>
  onAdvanceTrick: () => void
  onContinue: () => void
  onRename: (title: string) => void
}) {
  const seated = mySeatIndex !== null
  const showJoin =
    role === "unknown" && !seated && state.phase !== "game-over"
  const tableFull = filledSeats(state) >= state.settings.seatCount
  const showLobbyReady =
    state.phase === "lobby" && tableFull && role !== "unknown"
  const motion = useTableMotion(state, mySeatIndex)
  const myTurnToBid =
    seated &&
    state.phase === "bidding" &&
    state.currentSeat === mySeatIndex &&
    !motion.dealing
  const showRoundEnd = state.phase === "round-end" && role !== "unknown"
  const lastRound = state.history[state.history.length - 1]
  const waitingToContinue =
    role !== "unknown" &&
    state.phase === "trick-end" &&
    !motion.trickLeaving

  useContinuePrompt(waitingToContinue, onAdvanceTrick)
  useJoinPrompt({
    active: showJoin,
    taken: filledSeats(state),
    seats: state.settings.seatCount,
    open: !tableFull,
    onJoin,
    onSpectate,
  })
  useLobbyReadyPrompt({
    active: showLobbyReady,
    onStart,
  })
  useRoundEndPrompt({
    active: showRoundEnd,
    rows: (lastRound ? state.seats : []).map((seat) => ({
      seat: seat.index,
      name: seat.displayName ?? `Player ${seat.index + 1}`,
      score: lastRound?.scores[seat.index] ?? 0,
    })),
    onContinue,
  })
  useGameOverPrompt({
    active: state.phase === "game-over",
    state,
  })

  return (
    <div className="relative h-full overflow-hidden">
      <GameTable
        code={code}
        state={state}
        mySeat={mySeatIndex}
        spectating={role === "spectator"}
        onlineIds={online}
        motion={motion}
        onPlay={onPlay}
        onRename={onRename}
      />
      {myTurnToBid && mySeatIndex !== null && (
        <BidPanel state={state} seat={mySeatIndex} onBid={onBid} />
      )}
      {actionError && (
        <p className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-red-100">
          {actionError}
        </p>
      )}
    </div>
  )
}
