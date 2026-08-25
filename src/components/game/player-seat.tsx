"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  BotOff,
  Check,
  Crown,
  Ellipsis,
  LogOut,
  MessageCircleHeart,
  Shuffle,
} from "lucide-react";
import { isLegalPlay } from "@/lib/game/engine";
import { EMOTE_LABELS, TABLE_EMOTES, type TableEmote } from "@/lib/emotes";
import type { Card, GameState, Seat } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { useArrivingIndex } from "@/hooks/use-deal-in";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmoteIcon } from "./emote-icon";
import { FAN_CARD, fanPose } from "./fan";
import { PopConfirmButton } from "./pop-confirm";
import { originFromElement, usePlayOrigin } from "./play-origin";
import { CardFan, DealIn, PlayingCard } from "./playing-card";

export type TableSlot =
  | "south"
  | "west"
  | "east"
  | "north"
  | "north-left"
  | "north-right";

export function slotFor(count: number, relative: number): TableSlot {
  if (count === 2) return (["south", "north"] as const)[relative];
  if (count === 3) return (["south", "west", "east"] as const)[relative];
  if (count === 4)
    return (["south", "west", "north", "east"] as const)[relative];
  return (["south", "west", "north-left", "north-right", "east"] as const)[
    relative
  ];
}

const SLOT_CLASS: Record<TableSlot, string> = {
  south:
    "bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 items-center",
  west: "left-[max(0.75rem,env(safe-area-inset-left))] top-1/2 -translate-y-1/2 items-center",
  east: "right-[max(0.75rem,env(safe-area-inset-right))] top-1/2 -translate-y-1/2 items-center",
  north:
    "top-[max(2rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 items-center",
  "north-left":
    "top-[max(clamp(2.25rem,calc(2.25rem+max(0px,30rem-100vw)*0.08),3.5rem),env(safe-area-inset-top))] left-[min(22%,max(0.75rem,calc(50%-9rem)))] items-center",
  "north-right":
    "top-[max(clamp(2.25rem,calc(2.25rem+max(0px,30rem-100vw)*0.08),3.5rem),env(safe-area-inset-top))] right-[min(22%,max(0.75rem,calc(50%-9rem)))] items-center",
};

const EMOTE_CLASS: Record<TableSlot, string> = {
  south:
    "-top-2 left-1/2 -translate-x-1/2 -translate-y-full [--emote-dx:0] [--emote-dy:-1]",
  west: "top-1/2 -right-2 translate-x-full -translate-y-1/2 [--emote-dx:1] [--emote-dy:0]",
  east: "top-1/2 -left-2 -translate-x-full -translate-y-1/2 [--emote-dx:-1] [--emote-dy:0]",
  north:
    "-bottom-2 left-1/2 -translate-x-1/2 translate-y-full [--emote-dx:0] [--emote-dy:1]",
  "north-left":
    "-bottom-2 left-1/2 -translate-x-1/2 translate-y-full [--emote-dx:0.25] [--emote-dy:1]",
  "north-right":
    "-bottom-2 left-1/2 -translate-x-1/2 translate-y-full [--emote-dx:-0.25] [--emote-dy:1]",
};

export function PlayerSeat({
  seat,
  state,
  slot,
  self,
  spectating,
  online,
  emote,
  revealCount,
  dealing,
  wonTrick,
  canManageBots,
  onMakeBot,
  onRemoveBot,
  onSwapSeats,
  onLeave,
  onEmote,
  onPlay,
}: {
  seat: Seat;
  state: GameState;
  slot: TableSlot;
  self: boolean;
  spectating: boolean;
  online: boolean;
  emote?: { id: string; emote: TableEmote };
  revealCount?: number;
  dealing?: boolean;
  wonTrick?: boolean;
  canManageBots?: boolean;
  onMakeBot?: (seatIndex: number) => void;
  onRemoveBot?: (seatIndex: number) => void;
  onSwapSeats?: (seatIndex: number) => void;
  onLeave?: () => void;
  onEmote?: (emote: TableEmote) => void;
  onPlay?: (card: Card) => void | Promise<void | boolean>;
}) {
  const full = state.hands[seat.index] ?? [];
  const hand = revealCount === undefined ? full : full.slice(0, revealCount);
  const bid = state.bids[seat.index];
  const tricks = state.tricks[seat.index];
  const showFaces = self || spectating;
  const isTurn =
    (state.phase === "playing" || state.phase === "bidding") &&
    state.currentSeat === seat.index;
  const dealer = state.dealer === seat.index;
  const sideways = slot === "west" || slot === "east";

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 flex",
        sideways
          ? "flex-row items-center gap-2"
          : "max-w-[min(calc(100vw-7.5rem),48rem)] flex-col",
        SLOT_CLASS[slot]
      )}
    >
      {slot.startsWith("north") && (
        <div className="mb-3">
          <CardFan
            count={hand.length}
            cards={showFaces ? hand : undefined}
            faceDown={!showFaces}
            size="sm"
            dealing={dealing}
          />
        </div>
      )}
      {slot === "east" && (
        <SideHand slot="east">
          <CardFan
            count={hand.length}
            cards={showFaces ? hand : undefined}
            faceDown={!showFaces}
            size="sm"
            dealing={dealing}
          />
        </SideHand>
      )}

      <div
        className={cn(
          "relative",
          slot === "south" ? "mt-1 mb-7 md:mb-6" : "my-1",
          // Keep writing-mode on the sizing box for side seats. Without it,
          // WebKit (iOS) sizes this wrapper like horizontal text and the
          // vertical name hugs the right edge — clipping east seats.
          (slot === "west" || slot === "east") &&
            "w-max [writing-mode:vertical-rl]"
        )}
      >
        {emote && (
          <span
            className={cn(
              "pointer-events-none absolute z-30 [writing-mode:horizontal-tb]",
              EMOTE_CLASS[slot]
            )}
          >
            <span
              key={emote.id}
              aria-hidden
              className="seat-emote block text-[1.75rem] drop-shadow-md"
            >
              <EmoteIcon emote={emote.emote} />
            </span>
          </span>
        )}
        <div
          className={cn(
            "flex items-center gap-2 text-white/90",
            slot === "west" && "rotate-180"
          )}
        >
          {dealer && <DealerButton name={seat.displayName ?? "This seat"} />}
          <span
            className={cn(
              "text-sm font-medium",
              isTurn
                ? "name-turn"
                : seat.displayName
                ? "text-white/80"
                : "text-white/50"
            )}
          >
            {seat.displayName ?? <WaitingName />}
          </span>
          {wonTrick && (
            <Tooltip>
              <TooltipTrigger
                delay={200}
                className="pointer-events-auto inline-flex"
              >
                <Crown
                  aria-label="Won the trick"
                  className="size-3.5 shrink-0 fill-amber-200 text-amber-200"
                />
              </TooltipTrigger>
              <TooltipContent>
                {seat.displayName ?? `Player ${seat.index + 1}`} won this trick
              </TooltipContent>
            </Tooltip>
          )}
          <span className="inline-flex items-center gap-1">
       
            {seat.isBot ? (
              <Bot
                aria-label="Bot player"
                className="size-3.5 shrink-0 text-white/50"
              />
            ) : (
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  seat.playerId
                    ? online
                      ? "bg-emerald-300"
                      : "bg-white/30"
                    : "bg-white/15"
                )}
              />
            )}
    <span className="inline-flex items-center ">
            {onEmote && <EmoteMenu onEmote={onEmote} />}
            {(canManageBots || (self && onLeave)) && (
              <SeatMenu
                seat={seat}
                self={self}
                onMakeBot={canManageBots ? onMakeBot : undefined}
                onRemoveBot={canManageBots ? onRemoveBot : undefined}
                onSwapSeats={canManageBots ? onSwapSeats : undefined}
                onLeave={self ? onLeave : undefined}
              />
            )}
            </span>
          </span>
          {state.phase !== "lobby" && <BidIndicator bid={bid} tricks={tricks} />}
        </div>
      </div>

      {slot === "west" && (
        <SideHand slot="west">
          <CardFan
            count={hand.length}
            cards={showFaces ? hand : undefined}
            faceDown={!showFaces}
            size="sm"
            dealing={dealing}
          />
        </SideHand>
      )}

      {slot === "south" &&
        (showFaces ? (
          <OwnHand
            hand={hand}
            state={state}
            seat={seat.index}
            dealing={dealing}
            onPlay={onPlay}
          />
        ) : (
          <div className="flex items-end justify-center pt-1">
            <CardFan count={hand.length} faceDown size="lg" dealing={dealing} />
          </div>
        ))}
    </div>
  );
}

function OwnHand({
  hand,
  state,
  seat,
  dealing,
  onPlay,
}: {
  hand: Card[];
  state: GameState;
  seat: number;
  dealing?: boolean;
  onPlay?: (card: Card) => void | Promise<void | boolean>;
}) {
  const confirmToPlay = useCoarsePointer();
  const playOrigin = usePlayOrigin();
  const cardNodes = useRef(new Map<string, HTMLElement>());
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const arriving = useArrivingIndex(hand.length, dealing);
  const spec = confirmToPlay
    ? { ...FAN_CARD.lg, radius: 300, maxHalfAngle: 12 }
    : { ...FAN_CARD.xl, maxHalfAngle: 18 };
  const gap = confirmToPlay ? 2.6 : 1.6;
  const cardSize = confirmToPlay ? "lg" : "xl";
  const sample = fanPose(hand.length, 0, spec.radius, spec.maxHalfAngle, gap);
  const width = Math.max(spec.w, 2 * Math.abs(sample.x) + spec.w);
  const height = spec.h + sample.depth;
  const ourTurn =
    Boolean(onPlay) && state.phase === "playing" && state.currentSeat === seat;

  useEffect(() => {
    setPicked(null);
  }, [hand.length, ourTurn, confirmToPlay]);

  function rememberOrigin(card: Card) {
    const node = cardNodes.current.get(`${card.rank}${card.suit}`);
    const felt = node?.closest(".felt");
    if (!node || !felt || !playOrigin) return;
    playOrigin.set(seat, originFromElement(node, felt));
  }

  async function playNow(card: Card) {
    if (!onPlay || pendingRef.current) return;
    if (!isLegalPlay(state, seat, card)) return;
    pendingRef.current = true;
    rememberOrigin(card);
    setPending(true);
    try {
      await onPlay(card);
      setPicked(null);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  const selectedCard = picked !== null ? hand[picked] ?? null : null;
  const canPlaySelected =
    selectedCard !== null && ourTurn && isLegalPlay(state, seat, selectedCard);

  return (
    <div>
      <div
        className={cn(
          "pointer-events-auto relative transition-opacity duration-200",
          (!ourTurn || pending) && "opacity-70",
          pending && "pointer-events-none"
        )}
        style={{ width, height }}
        onMouseLeave={() => setHover(null)}
      >
        {hand.map((card, index) => {
          const canPlay = ourTurn && isLegalPlay(state, seat, card);
          const pose = fanPose(
            hand.length,
            index,
            spec.radius,
            spec.maxHalfAngle,
            gap
          );
          const spreadFrom = confirmToPlay ? picked : hover;
          const spread =
            spreadFrom === null || index === spreadFrom
              ? 0
              : Math.sign(index - spreadFrom) *
                neighborPush(Math.abs(index - spreadFrom));
          const lift = !confirmToPlay && hover === index ? -6 : 0;
          return (
            <div
              key={`${card.rank}${card.suit}`}
              ref={(node) => {
                const key = `${card.rank}${card.suit}`;
                if (node) cardNodes.current.set(key, node);
                else cardNodes.current.delete(key);
              }}
              className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              onMouseEnter={() => setHover(index)}
              style={{
                transform: `translateX(calc(-50% + ${
                  pose.x + spread
                }px)) translateY(${pose.y - pose.depth + lift}px) rotate(${
                  pose.rotate
                }deg)`,
                zIndex: index,
                isolation: "isolate",
              }}
            >
              <DealIn active={index === arriving}>
                <PlayingCard
                  card={card}
                  size={cardSize}
                  selected={picked === index}
                  disabled={ourTurn && !canPlay}
                  onClick={
                    canPlay
                      ? () => {
                          if (pendingRef.current) return;
                          if (confirmToPlay) {
                            setPicked((current) =>
                              current === index ? null : index
                            );
                            return;
                          }
                          void playNow(card);
                        }
                      : undefined
                  }
                  className="touch-manipulation hover:translate-y-0"
                />
              </DealIn>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none fixed bottom-[calc(12rem+env(safe-area-inset-bottom,0px))] left-1/2 z-40 -translate-x-1/2">
        <PopConfirmButton
          show={confirmToPlay && canPlaySelected}
          label="Play selected card"
          className="pointer-events-auto flex size-9 touch-manipulation items-center justify-center rounded-full bg-amber-200 text-[#16352b] shadow-[0_0_0_1px_rgb(251_191_36/0.45)] hover:bg-amber-100"
          onConfirm={() => {
            if (selectedCard) return playNow(selectedCard);
          }}
        >
          <Check className="size-4" strokeWidth={2.75} />
        </PopConfirmButton>
      </div>
    </div>
  );
}

function neighborPush(distance: number) {
  if (distance === 1) return 10;
  if (distance === 2) return 6;
  return 3;
}

function SideHand({
  slot,
  children,
}: {
  slot: "west" | "east";
  children: ReactNode;
}) {
  return (
    <div className="flex h-48 w-22 shrink-0 items-center justify-center overflow-visible">
      <div
        className={cn(
          "overflow-visible",
          slot === "west" ? "-rotate-90" : "rotate-90"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function WaitingName() {
  return <span className="waiting-shimmer">Waiting</span>;
}

function DealerButton({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        aria-label={`${name} is the dealer`}
        className="pointer-events-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-[#16352b] shadow-[0_0_0_1px_rgb(251_191_36/0.45)]"
      >
        D
      </TooltipTrigger>
      <TooltipContent>{name} is the dealer</TooltipContent>
    </Tooltip>
  );
}

function SeatMenu({
  seat,
  self,
  onMakeBot,
  onRemoveBot,
  onSwapSeats,
  onLeave,
}: {
  seat: Seat;
  self: boolean;
  onMakeBot?: (seatIndex: number) => void;
  onRemoveBot?: (seatIndex: number) => void;
  onSwapSeats?: (seatIndex: number) => void;
  onLeave?: () => void;
}) {
  const empty = !seat.playerId;
  const showMakeBot = empty && onMakeBot;
  const showRemoveBot = seat.isBot && onRemoveBot;
  const showSwap = !self && onSwapSeats;
  const showLeave = self && onLeave;

  if (!showMakeBot && !showRemoveBot && !showSwap && !showLeave) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Seat options"
        className="pointer-events-auto flex size-6 shrink-0 items-center justify-center rounded-md text-white/45 hover:bg-white/10 hover:text-white/80"
      >
        <Ellipsis className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        className="w-auto min-w-36"
      >
        {showMakeBot && (
          <DropdownMenuItem onClick={() => onMakeBot(seat.index)}>
            <Bot />
            Make bot
          </DropdownMenuItem>
        )}
        {showSwap && (
          <DropdownMenuItem onClick={() => onSwapSeats(seat.index)}>
            <Shuffle />
            Change places
          </DropdownMenuItem>
        )}
        {showRemoveBot && (
          <DropdownMenuItem onClick={() => onRemoveBot(seat.index)}>
            <BotOff />
            Remove bot
          </DropdownMenuItem>
        )}
        {showLeave && (
          <DropdownMenuItem onClick={onLeave}>
            <LogOut />
            Leave game
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmoteMenu({ onEmote }: { onEmote: (emote: TableEmote) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Emotes"
        title="Emotes"
        className="pointer-events-auto inline-flex size-6 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
      >
        <MessageCircleHeart className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="top"
        sideOffset={6}
        className="w-auto rounded-2xl border-0 bg-black/25 p-1.5 text-white shadow-none ring-1 ring-white/15 backdrop-blur-sm"
      >
        <div className="grid grid-cols-4">
          {TABLE_EMOTES.map((emote) => (
            <button
              key={emote}
              type="button"
              onClick={() => {
                onEmote(emote);
                setOpen(false);
              }}
              className="flex size-9 items-center justify-center rounded-full text-[1.35rem] transition-colors hover:bg-white/20 active:scale-95 md:size-8 md:text-xl"
              aria-label={EMOTE_LABELS[emote]}
            >
              <EmoteIcon emote={emote} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BidIndicator({ bid, tricks }: { bid: number | null; tricks: number }) {
  if (bid === null) return null

  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        className="pointer-events-auto text-[10px] leading-none tabular-nums text-white/50"
      >
        {tricks}
        <span className="text-white/30">/</span>
        {bid}
      </TooltipTrigger>
      <TooltipContent>{bidMadeLabel(bid, tricks)}</TooltipContent>
    </Tooltip>
  )
}

function bidMadeLabel(bid: number | null, tricks: number) {
  if (bid === null) return "No bid yet";
  const bidWord = bid === 1 ? "trick" : "tricks";
  return `Made ${tricks}, bid ${bid} ${bidWord}`;
}
