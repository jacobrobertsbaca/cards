"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { LoaderPinwheel } from "lucide-react"
import { useGame } from "@/hooks/use-game"
import { useBotController } from "@/hooks/use-bot-controller"
import { useContinuePrompt } from "@/hooks/use-continue-prompt"
import { useGameOverPrompt } from "@/hooks/use-game-over-prompt"
import { useJoinPrompt } from "@/hooks/use-join-prompt"
import { useLobbyReadyPrompt } from "@/hooks/use-lobby-ready-prompt"
import { useRoundEndPrompt } from "@/hooks/use-round-end-prompt"
import { useTableMotion } from "@/hooks/use-table-motion"
import { gameCode } from "@/lib/codes"
import {
  GameError,
  beginRematch,
  continueTrick,
  createRematch,
  filledSeats,
  isLegalPlay,
  joinGame,
  leaveGame,
  makeBot,
  placeBid,
  placeCall,
  playCard,
  removeBot,
  renameGame,
  renameSeat,
  seatForPlayer,
  startGame,
  startRound,
  swapSeats,
  updateSettings,
} from "@/lib/game/actions"
import { displayGameTitle } from "@/lib/game/title"
import { rememberGame } from "@/lib/history"
import { gameTooltip } from "@/lib/game/rules"
import { playDeal, unlockAudio } from "@/lib/audio"
import { sameCard } from "@/lib/game/cards"
import { isTableEmote, type TableEmote } from "@/lib/emotes"
import type { Card, GameSettings, GameState } from "@/lib/game/types"
import { isBridge, isOhHell } from "@/lib/game/types"
import type { BridgeCall } from "@/lib/bridge/types"
import { actingSeatFor } from "@/lib/bridge/engine"
import { playFromHistory, sidePoints } from "@/lib/bridge/scoring"
import { subscribeIdentity } from "@/lib/identity"
import { getGameStore } from "@/lib/store"
import { GameTable } from "./table"
import { BidPanel } from "./overlays"
import { BridgeBidPanel } from "@/components/bridge/bid-panel"

export function GameRoom({ code }: { code: string }) {
  const router = useRouter()
  const { record, status, error, online, emotes, sendEmote, apply, identity } = useGame(code)
  const [spectating, setSpectating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [optimisticState, setOptimisticState] = useState<GameState | null>(null)
  const optimisticPlay = useRef<Card | null>(null)

  const state = optimisticState ?? record?.state
  const stateRef = useRef(state)
  stateRef.current = state
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
      kind: state.settings.kind,
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

  useEffect(() => {
    const card = optimisticPlay.current
    if (!card || mySeat == null || !record?.state) return
    const stillInHand = record.state.hands[mySeat.index]?.some((item) =>
      sameCard(item, card)
    )
    if (!stillInHand) {
      optimisticPlay.current = null
      setOptimisticState(null)
    }
  }, [mySeat, record?.state, record?.version])

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
      throw err
    }
  }

  async function onCall(call: BridgeCall) {
    unlockAudio()
    if (mySeat == null) return
    try {
      await apply((current) => placeCall(current, mySeat.index, call))
      playDeal()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not bid")
      throw err
    }
  }

  const onPlay = useCallback(async (card: Card) => {
    unlockAudio()
    if (mySeat == null) return false

    const current = stateRef.current
    if (!current || !isLegalPlay(current, mySeat.index, card)) return false
    const fromSeat =
      isBridge(current)
        ? (actingSeatFor(current, mySeat.index) ?? mySeat.index)
        : mySeat.index

    optimisticPlay.current = card
    setOptimisticState(playCard(current, mySeat.index, card))
    playDeal()
    setActionError(null)

    void apply((server) => {
      if (!isLegalPlay(server, mySeat.index, card)) return server
      return playCard(server, mySeat.index, card)
    })
      .then((next) => {
        const stillInHand = next.state.hands[fromSeat]?.some((item) =>
          sameCard(item, card)
        )
        if (stillInHand) {
          optimisticPlay.current = null
          setOptimisticState(null)
        }
      })
      .catch((err) => {
        optimisticPlay.current = null
        setOptimisticState(null)
        if (err instanceof GameError && err.message === "That card cannot be played") {
          setActionError(null)
          return
        }
        setActionError(err instanceof Error ? err.message : "Could not play")
      })

    return true
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

  async function onSaveSettings(settings: GameSettings) {
    await apply((current) => updateSettings(current, settings))
  }

  async function onMakeBot(seatIndex: number) {
    try {
      await apply((current) => makeBot(current, seatIndex))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not add bot")
    }
  }

  async function onRemoveBot(seatIndex: number) {
    try {
      await apply((current) => removeBot(current, seatIndex))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not remove bot")
    }
  }

  async function onSwapSeats(targetSeatIndex: number) {
    try {
      await apply((current) => swapSeats(current, identity.id, targetSeatIndex))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not change places")
    }
  }

  async function onLeave() {
    unlockAudio()
    setActionError(null)
    try {
      await apply((current) => leaveGame(current, identity.id))
      setSpectating(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not leave")
    }
  }

  async function onRematch() {
    unlockAudio()
    setActionError(null)
    const current = stateRef.current
    if (!current) return

    if (current.rematchCode) {
      rememberGame({
        code: current.rematchCode,
        kind: "oh-hell",
        title: displayGameTitle(current.title),
        summary: gameTooltip(current.settings),
      })
      router.push(`/${current.rematchCode}`)
      return
    }

    const nextCode = gameCode()
    try {
      const rematch = createRematch(current)
      await getGameStore().create({
        code: nextCode,
        kind: rematch.settings.kind,
        state: rematch,
      })
      const saved = await apply((existing) => beginRematch(existing, nextCode))
      const dest = saved.state.rematchCode ?? nextCode
      rememberGame({
        code: dest,
        kind: "oh-hell",
        title: displayGameTitle(rematch.title),
        summary: gameTooltip(rematch.settings),
      })
      router.push(`/${dest}`)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not rematch")
    }
  }

  return (
    <AnimatePresence mode="wait">
      {status === "loading" ? (
        <motion.div
          key="loading"
          className="flex h-full items-center justify-center text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <LoaderPinwheel
            className="size-6 animate-spin"
            aria-label="Loading game"
          />
        </motion.div>
      ) : status === "missing" ? (
        <motion.div
          key="missing"
          className="flex h-full flex-col items-center justify-center gap-2 text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-lg font-medium">No table here</p>
          <p className="text-sm text-white/60">That link does not match a game.</p>
        </motion.div>
      ) : status === "error" || !state ? (
        <motion.div
          key="error"
          className="flex h-full items-center justify-center text-sm text-red-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {error ?? "Something went wrong"}
        </motion.div>
      ) : (
        <motion.div
          key="ready"
          className="h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <ReadyTable
            state={state}
            version={record?.version}
            mySeatIndex={mySeat?.index ?? null}
            playerId={identity.id}
            role={role}
            online={online}
            emotes={emotes}
            onEmote={sendEmote}
            actionError={actionError}
            onJoin={() => void onJoin()}
            onSpectate={() => setSpectating(true)}
            onStart={() => void onStart()}
            onBid={onBid}
            onCall={onCall}
            onPlay={onPlay}
            onAdvanceTrick={() => void onAdvanceTrick()}
            onContinue={() => void onContinue()}
            onRename={(title) => void onRename(title)}
            onSaveSettings={onSaveSettings}
            onMakeBot={(seatIndex) => void onMakeBot(seatIndex)}
            onRemoveBot={(seatIndex) => void onRemoveBot(seatIndex)}
            onSwapSeats={(seatIndex) => void onSwapSeats(seatIndex)}
            onLeave={() => void onLeave()}
            onRematch={() => void onRematch()}
            apply={apply}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ReadyTable({
  state,
  version,
  mySeatIndex,
  playerId,
  role,
  online,
  emotes,
  onEmote,
  actionError,
  onJoin,
  onSpectate,
  onStart,
  onBid,
  onCall,
  onPlay,
  onAdvanceTrick,
  onContinue,
  onRename,
  onSaveSettings,
  onMakeBot,
  onRemoveBot,
  onSwapSeats,
  onLeave,
  onRematch,
  apply,
}: {
  state: GameState
  version: number | undefined
  mySeatIndex: number | null
  playerId: string
  role: "player" | "spectator" | "unknown"
  online: string[]
  emotes: { id: string; playerId: string; emote: string }[]
  onEmote: (emote: TableEmote) => void
  actionError: string | null
  onJoin: () => void
  onSpectate: () => void
  onStart: () => void
  onBid: (bid: number) => void | Promise<void>
  onCall: (call: BridgeCall) => void | Promise<void>
  onPlay: (card: Card) => void | Promise<void | boolean>
  onAdvanceTrick: () => void
  onContinue: () => void
  onRename: (title: string) => void
  onSaveSettings: (settings: GameSettings) => void | Promise<void>
  onMakeBot: (seatIndex: number) => void
  onRemoveBot: (seatIndex: number) => void
  onSwapSeats: (seatIndex: number) => void
  onLeave: () => void
  onRematch: () => void
  apply: (mutate: (current: GameState) => GameState) => Promise<unknown>
}) {
  const seated = mySeatIndex !== null
  const showJoin =
    role === "unknown" && !seated && state.phase !== "game-over"
  const tableFull = filledSeats(state) >= state.settings.seatCount
  const showLobbyReady =
    state.phase === "lobby" && tableFull && role !== "unknown"
  const motion = useTableMotion(state, mySeatIndex)
  const biddingReady =
    !motion.dealing &&
    !motion.enteringDeal &&
    (motion.trumpPhase === "rest" || motion.trumpPhase === "hidden")
  const myTurnToBid =
    seated &&
    state.phase === "bidding" &&
    state.currentSeat === mySeatIndex &&
    biddingReady &&
    (isOhHell(state) ? state.bids[mySeatIndex] === null : isBridge(state))
  const showRoundEnd = state.phase === "round-end" && role !== "unknown"
  const lastRound = state.history[state.history.length - 1]
  const waitingToContinue =
    role !== "unknown" &&
    state.phase === "trick-end" &&
    !motion.trickLeaving

  const emotesBySeat: Record<number, { id: string; emote: TableEmote }> = {}
  for (const event of emotes) {
    if (!isTableEmote(event.emote)) continue
    const seat = state.seats.find((item) => item.playerId === event.playerId)
    if (seat) emotesBySeat[seat.index] = { id: event.id, emote: event.emote }
  }

  const roundEndRows = (() => {
    if (!lastRound) return []
    if (isOhHell(state) && "scores" in lastRound) {
      return state.seats.map((seat) => ({
        seat: seat.index,
        name: seat.displayName ?? `Player ${seat.index + 1}`,
        score: lastRound.scores[seat.index] ?? 0,
      }))
    }
    if (isBridge(state) && "net" in lastRound) {
      const play = playFromHistory(state.history)
      return [
        { seat: 0, name: "NS", score: sidePoints(play, "NS") },
        { seat: 1, name: "EW", score: sidePoints(play, "EW") },
      ]
    }
    return []
  })()

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
    rows: roundEndRows,
    onContinue,
  })
  useGameOverPrompt({
    active: state.phase === "game-over",
    state,
    onRematch,
  })
  useBotController(state, version, mySeatIndex, apply, {
    playerId,
    onlineIds: online,
  })

  return (
    <div className="relative h-full overflow-hidden">
      <GameTable
        state={state}
        mySeat={mySeatIndex}
        spectating={role === "spectator"}
        onlineIds={online}
        emotesBySeat={emotesBySeat}
        canEmote={role === "player"}
        onEmote={onEmote}
        motion={motion}
        onPlay={onPlay}
        onRename={onRename}
        onSaveSettings={onSaveSettings}
        canManageBots={
          (role === "player" || role === "spectator") && state.phase === "lobby"
        }
        onMakeBot={onMakeBot}
        onRemoveBot={onRemoveBot}
        onSwapSeats={role === "player" ? onSwapSeats : undefined}
        onLeave={
          role === "player" && state.phase === "lobby" ? onLeave : undefined
        }
      />
      {myTurnToBid && mySeatIndex !== null && isOhHell(state) && (
        <BidPanel state={state} seat={mySeatIndex} onBid={onBid} />
      )}
      {myTurnToBid && mySeatIndex !== null && isBridge(state) && (
        <BridgeBidPanel state={state} seat={mySeatIndex} onCall={onCall} />
      )}
      {actionError && (
        <p className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-red-100">
          {actionError}
        </p>
      )}
    </div>
  )
}
