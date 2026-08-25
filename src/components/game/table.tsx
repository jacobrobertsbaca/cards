"use client";

import { useState } from "react";
import type { TableEmote } from "@/lib/emotes";
import { rulesLine } from "@/lib/game/rules";
import { trickWinner } from "@/lib/game/engine";
import { displayGameTitle } from "@/lib/game/title";
import type { Card, GameSettings, GameState } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TableMotion } from "@/hooks/use-table-motion";
import { PlayerSeat, slotFor } from "./player-seat";
import { Scoreboard } from "./score-sheet";
import { DealOverlay } from "./deal-overlay";
import { PlayOriginProvider } from "./play-origin";
import { GameSettingsSheet } from "./settings-sheet";
import { TrickPile } from "./trick-pile";
import { TrumpSpot } from "./trump-reveal";

export function GameTable({
  state,
  mySeat,
  spectating,
  onlineIds,
  emotesBySeat,
  canEmote,
  onEmote,
  motion,
  onPlay,
  onRename,
  onSaveSettings,
  canManageBots,
  onMakeBot,
  onRemoveBot,
  onSwapSeats,
  onLeave,
}: {
  state: GameState;
  mySeat: number | null;
  spectating: boolean;
  onlineIds: string[];
  emotesBySeat: Record<number, { id: string; emote: TableEmote }>;
  canEmote: boolean;
  onEmote: (emote: TableEmote) => void;
  motion: TableMotion;
  onPlay: (card: Card) => void | Promise<void | boolean>;
  onRename: (title: string) => void;
  onSaveSettings: (settings: GameSettings) => void | Promise<void>;
  canManageBots?: boolean;
  onMakeBot?: (seatIndex: number) => void;
  onRemoveBot?: (seatIndex: number) => void;
  onSwapSeats?: (seatIndex: number) => void;
  onLeave?: () => void;
}) {
  const anchor = mySeat ?? 0;
  const count = state.settings.seatCount;
  const waiting =
    (state.phase === "trick-end" && !motion.trickLeaving) ||
    state.phase === "round-end";
  const heldTrickWinner =
    (state.phase === "trick-end" ||
      state.phase === "round-end" ||
      state.phase === "game-over") &&
    state.lastTrick.length > 0
      ? trickWinner(state.lastTrick, state.trump)
      : null;
  const trickWinnerSeat = motion.trickWinnerSeat ?? heldTrickWinner;
  const trumpCard =
    !motion.enteringDeal && state.trump && motion.trumpPhase !== "hidden"
      ? state.trump
      : null;

  return (
    <PlayOriginProvider>
      <div
        className={cn(
          "felt relative h-full min-h-0 w-full overflow-hidden overscroll-none",
          waiting && "cursor-pointer"
        )}
      >
        <header className="pointer-events-none absolute top-[max(0.5rem,env(safe-area-inset-top))] right-[max(0.5rem,env(safe-area-inset-right))] left-[max(3.25rem,env(safe-area-inset-left))] z-20 flex items-start justify-between gap-4 text-white/80 md:left-0 md:pl-[var(--header-left-pad,0.75rem)]">
          <div className="hidden min-w-0 md:block">
            <TitleEditor
              title={displayGameTitle(state.title)}
              onRename={onRename}
            />
            <p className="max-w-md text-xs text-white/55">
              {rulesLine(state.settings)}
            </p>
          </div>
          <GameSettingsSheet
            state={state}
            editable={state.phase === "lobby"}
            onSave={onSaveSettings}
          />
        </header>

        {trumpCard && (
          <TrumpSpot
            card={trumpCard}
            phase={
              motion.trumpPhase as Exclude<typeof motion.trumpPhase, "hidden">
            }
          />
        )}

        <TrickPile
          plays={motion.trick}
          leaving={motion.trickLeaving}
          winnerSeat={trickWinnerSeat}
          mySeat={anchor}
          seatCount={count}
          highlightWinner={
            (state.phase === "trick-end" || state.phase === "round-end") &&
            !motion.trickLeaving
          }
          takenByUs={mySeat === null || trickWinnerSeat === mySeat}
        />

        {state.seats.map((seat) => {
          const relative = (seat.index - anchor + count) % count;
          const slot = slotFor(count, relative);
          const self = seat.index === mySeat;
          return (
            <PlayerSeat
              key={seat.index}
              seat={seat}
              state={state}
              slot={slot}
              self={self}
              spectating={spectating}
              online={seat.playerId ? onlineIds.includes(seat.playerId) : false}
              emote={emotesBySeat[seat.index]}
              revealCount={
                motion.dealing || motion.enteringDeal
                  ? motion.dealing
                    ? motion.revealed[seat.index]
                    : 0
                  : undefined
              }
              dealing={motion.dealing}
              dealDelays={
                motion.dealing
                  ? motion.dealDelays?.[seat.index]
                  : undefined
              }
              wonTrick={trickWinnerSeat === seat.index}
              canManageBots={canManageBots}
              onMakeBot={onMakeBot}
              onRemoveBot={onRemoveBot}
              onSwapSeats={onSwapSeats}
              onLeave={self ? onLeave : undefined}
              onEmote={self && canEmote ? onEmote : undefined}
              onPlay={
                self && state.phase === "playing" && !motion.dealing
                  ? onPlay
                  : undefined
              }
            />
          );
        })}

        <DealOverlay shuffling={motion.shuffling} />
        <Scoreboard state={state} />
      </div>
    </PlayOriginProvider>
  );
}

function TitleEditor({
  title,
  onRename,
}: {
  title: string;
  onRename: (title: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function save() {
    if (draft !== null) onRename(draft);
    setDraft(null);
  }

  if (draft !== null) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <input
          value={draft}
          autoFocus
          maxLength={48}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          className="pointer-events-auto w-64 bg-transparent text-sm font-medium text-white outline-none"
        />
      </form>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        onClick={() => setDraft(title)}
        className="pointer-events-auto text-left text-sm font-medium text-white hover:text-white/80"
      >
        {title}
      </TooltipTrigger>
      <TooltipContent>Click to edit game name</TooltipContent>
    </Tooltip>
  );
}
