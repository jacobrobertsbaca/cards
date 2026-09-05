"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Bot,
  BotOff,
  Check,
  Crown,
  Ellipsis,
  LogOut,
  Shuffle,
} from "lucide-react";
import { motion } from "motion/react";
import { isLegalPlay } from "@/lib/game/actions";
import { emoteFlight, type TableEmote } from "@/lib/emotes";
import type { Card, GameState, Seat } from "@/lib/game/types";
import { isBridge, isOhHell } from "@/lib/game/types";
import { isDummyRevealed } from "@/lib/game/view";
import { cn } from "@/lib/utils";
import {
  BridgeAuctionBadge,
  BridgePlayBadge,
} from "@/components/bridge/auction-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmoteIcon } from "./emote-icon";
import { SeatChatBubble } from "./chat-bubble";
import { DealIn } from "./deal-in";
import { FAN_CARD, fanPose } from "./fan";
import { PlayConfirmDock } from "./pop-confirm";
import { originFromElement, usePlayOrigin } from "./play-origin";
import { CardFan, PlayingCard } from "./playing-card";
import type { ChatMessage } from "@/lib/store";

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

const EMOTE_ANCHOR: Record<TableSlot, string> = {
  south: "bottom-full left-1/2 mb-6 -translate-x-1/2",
  west: "top-1/2 left-full ml-6 -translate-y-1/2",
  east: "top-1/2 right-full mr-6 -translate-y-1/2",
  north: "top-full left-1/2 mt-6 -translate-x-1/2",
  "north-left": "top-full left-1/2 mt-6 -translate-x-1/2",
  "north-right": "top-full left-1/2 mt-6 -translate-x-1/2",
};

/** Pin the emote to the far side of the gap so it grows away from the nameplate. */
const EMOTE_ORIGIN: Record<TableSlot, string> = {
  south: "bottom-0 left-0",
  west: "top-0 left-0",
  east: "top-0 right-0",
  north: "top-0 left-0",
  "north-left": "top-0 left-0",
  "north-right": "top-0 left-0",
};

const EMOTE_DIR: Record<TableSlot, { dx: number; dy: number }> = {
  south: { dx: 0, dy: -1 },
  west: { dx: 1, dy: 0 },
  east: { dx: -1, dy: 0 },
  north: { dx: 0, dy: 1 },
  "north-left": { dx: 0.25, dy: 1 },
  "north-right": { dx: -0.25, dy: 1 },
};

export function PlayerSeat({
  seat,
  state,
  slot,
  self,
  spectating,
  online,
  emotes = [],
  chatBubble,
  revealCount,
  dealing,
  dealDelays,
  wonTrick,
  canManageBots,
  onMakeBot,
  onRemoveBot,
  onSwapSeats,
  onLeave,
  onPlay,
  controllerSeat = null,
}: {
  seat: Seat;
  state: GameState;
  slot: TableSlot;
  self: boolean;
  spectating: boolean;
  online: boolean;
  emotes?: { id: string; emote: TableEmote }[];
  chatBubble?: ChatMessage;
  revealCount?: number;
  dealing?: boolean;
  dealDelays?: number[];
  wonTrick?: boolean;
  canManageBots?: boolean;
  onMakeBot?: (seatIndex: number) => void;
  onRemoveBot?: (seatIndex: number) => void;
  onSwapSeats?: (seatIndex: number) => void;
  onLeave?: () => void;
  onPlay?: (card: Card) => void | Promise<void | boolean>;
  controllerSeat?: number | null;
}) {
  const full = state.hands[seat.index] ?? [];
  const hand = revealCount === undefined ? full : full.slice(0, revealCount);
  const bid = isOhHell(state) ? state.bids[seat.index] : null;
  const tricks = state.tricks[seat.index];
  const dummyUp =
    isBridge(state) &&
    isDummyRevealed(state) &&
    state.contract?.dummy === seat.index;
  const showFaces = self || spectating || dummyUp;
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
          ? cn(
              "flex-row items-center",
              dummyUp
                ? "-space-x-2 gap-0 md:gap-0 md:space-x-0"
                : "gap-0 md:gap-2.5"
            )
          : "max-w-[min(calc(100vw-7.5rem),48rem)] flex-col",
        SLOT_CLASS[slot]
      )}
    >
      {slot.startsWith("north") && (
        <div
          className={cn(
            "max-w-[min(96vw,42rem)]",
            dummyUp ? "mb-2" : "mb-2 md:mb-3"
          )}
        >
          {dummyUp ? (
            <OwnHand
              hand={hand}
              state={state}
              seat={seat.index}
              controllerSeat={controllerSeat ?? seat.index}
              dealing={dealing}
              dealDelays={dealDelays}
              onPlay={onPlay}
              confirmPlacement="north"
            />
          ) : (
            <CardFan
              count={hand.length}
              cards={showFaces ? hand : undefined}
              faceDown={!showFaces}
              size="sm"
              dealing={dealing}
              dealDelays={dealDelays}
              className="origin-bottom md:scale-[1.22]"
            />
          )}
        </div>
      )}
      {slot === "east" && (
        <SideHand slot="east" roomy={dummyUp}>
          {dummyUp ? (
            <OwnHand
              hand={hand}
              state={state}
              seat={seat.index}
              controllerSeat={controllerSeat ?? seat.index}
              dealing={dealing}
              dealDelays={dealDelays}
              onPlay={onPlay}
              compact
              confirmPlacement="east"
            />
          ) : (
            <CardFan
              count={hand.length}
              cards={showFaces ? hand : undefined}
              faceDown={!showFaces}
              size="sm"
              dealing={dealing}
              dealDelays={dealDelays}
              className="origin-center md:scale-[1.22]"
            />
          )}
        </SideHand>
      )}

      <div
        className={cn(
          "relative",
          slot === "south"
            ? dummyUp
              ? "mt-1 mb-2.5"
              : "mt-1 mb-7 md:mb-6"
            : dummyUp
              ? "my-1.5"
              : "my-1",
          // Keep writing-mode on the sizing box for side seats. Without it,
          // WebKit (iOS) sizes this wrapper like horizontal text and the
          // vertical name hugs the right edge — clipping east seats.
          // Sideways text-orientation + svg rotate keep bot/suit/menu icons
          // aligned with the vertical seat chrome.
          sideways &&
            "w-max [writing-mode:vertical-rl] [text-orientation:sideways] [&_svg]:rotate-90"
        )}
      >
        {chatBubble && (
          <SeatChatBubble
            slot={slot}
            bubbleKey={chatBubble.id}
            body={chatBubble.body}
          />
        )}
        {emotes.length > 0 && (
          <span
            className={cn(
              // Reset writing-mode + undo the sideways seat's [&_svg]:rotate-90
              // so emotes stay upright for every player.
              "pointer-events-none absolute z-30 [writing-mode:horizontal-tb] [&_svg]:rotate-0!",
              EMOTE_ANCHOR[slot]
            )}
          >
            {emotes.map((item) => {
              const dir = EMOTE_DIR[slot];
              const flight = emoteFlight(item.id);
              return (
                <span
                  key={item.id}
                  aria-hidden
                  className={cn(
                    "seat-emote absolute block text-[3.35rem] drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]",
                    EMOTE_ORIGIN[slot]
                  )}
                  style={
                    {
                      "--emote-dx": dir.dx + flight.scatterX,
                      "--emote-dy": dir.dy + flight.scatterY,
                      "--emote-ox": `${flight.originX}px`,
                      "--emote-oy": `${flight.originY}px`,
                      "--emote-rot": `${flight.rot}deg`,
                      "--emote-scale": flight.scale,
                    } as CSSProperties
                  }
                >
                  <EmoteIcon emote={item.emote} />
                </span>
              );
            })}
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
            <span className="inline-flex items-center">
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
            {state.phase !== "lobby" &&
              (isOhHell(state) ? (
                <BidIndicator bid={bid} tricks={tricks} />
              ) : isBridge(state) && state.phase === "bidding" ? (
                <BridgeAuctionBadge state={state} seatIndex={seat.index} />
              ) : isBridge(state) ? (
                <BridgePlayBadge
                  state={state}
                  seatIndex={seat.index}
                  tricks={tricks}
                />
              ) : null)}
          </span>
        </div>
      </div>

      {slot === "west" && (
        <SideHand slot="west" roomy={dummyUp}>
          {dummyUp ? (
            <OwnHand
              hand={hand}
              state={state}
              seat={seat.index}
              controllerSeat={controllerSeat ?? seat.index}
              dealing={dealing}
              dealDelays={dealDelays}
              onPlay={onPlay}
              compact
              confirmPlacement="west"
            />
          ) : (
            <CardFan
              count={hand.length}
              cards={showFaces ? hand : undefined}
              faceDown={!showFaces}
              size="sm"
              dealing={dealing}
              dealDelays={dealDelays}
              className="origin-center md:scale-[1.22]"
            />
          )}
        </SideHand>
      )}

      {slot === "south" &&
        (dummyUp ? (
          <div className="pt-1.5">
            <OwnHand
              hand={hand}
              state={state}
              seat={seat.index}
              controllerSeat={controllerSeat ?? seat.index}
              dealing={dealing}
              dealDelays={dealDelays}
              onPlay={onPlay}
              confirmPlacement="south"
            />
          </div>
        ) : showFaces ? (
          <OwnHand
            hand={hand}
            state={state}
            seat={seat.index}
            controllerSeat={controllerSeat ?? seat.index}
            dealing={dealing}
            dealDelays={dealDelays}
            onPlay={onPlay}
            confirmPlacement="south"
          />
        ) : (
          <div className="flex items-end justify-center pt-1">
            <CardFan
              count={hand.length}
              faceDown
              size="lg"
              dealing={dealing}
              dealDelays={dealDelays}
              className="origin-bottom md:scale-[1.12]"
            />
          </div>
        ))}
    </div>
  );
}

function OwnHand({
  hand,
  state,
  seat,
  controllerSeat,
  dealing,
  dealDelays,
  onPlay,
  compact = false,
  confirmPlacement = "south",
}: {
  hand: Card[];
  state: GameState;
  seat: number;
  controllerSeat: number;
  dealing?: boolean;
  dealDelays?: number[];
  onPlay?: (card: Card) => void | Promise<void | boolean>;
  compact?: boolean;
  confirmPlacement?: "south" | "north" | "east" | "west";
}) {
  const confirmToPlay = useCoarsePointer();
  const playOrigin = usePlayOrigin();
  const cardNodes = useRef(new Map<string, HTMLElement>());
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const spec = compact
    ? { ...FAN_CARD.md, radius: 240, maxHalfAngle: 16 }
    : confirmToPlay
      ? { ...FAN_CARD.lg, radius: 320, maxHalfAngle: 15 }
      : { ...FAN_CARD.xl, maxHalfAngle: 18 };
  const gap = compact ? 2.1 : confirmToPlay ? 3.2 : 1.6;
  const cardSize = compact ? "md" : confirmToPlay ? "lg" : "xl";
  const sample = fanPose(hand.length, 0, spec.radius, spec.maxHalfAngle, gap);
  const width = Math.max(spec.w, 2 * Math.abs(sample.x) + spec.w);
  const height = spec.h + sample.depth;
  const ourTurn =
    Boolean(onPlay) &&
    state.phase === "playing" &&
    state.currentSeat === seat;

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
    if (!isLegalPlay(state, controllerSeat, card)) return;
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
    selectedCard !== null &&
    ourTurn &&
    isLegalPlay(state, controllerSeat, selectedCard);

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
          const canPlay = ourTurn && isLegalPlay(state, controllerSeat, card);
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
          const maxLift = 6;
          const lift = !confirmToPlay && hover === index ? maxLift : 0;
          const delayMs = dealing ? dealDelays?.[index] : undefined;
          const fanTransition = dealing
            ? { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.7 }
            : {
                type: "tween" as const,
                duration: 0.34,
                ease: [0.22, 1, 0.36, 1] as const,
              };
          return (
            // Zero-size anchor at the fan origin. Full-size wrappers here used to
            // stack at center and steal hits from cards transformed away.
            <div
              key={`${card.rank}${card.suit}`}
              className="pointer-events-none absolute bottom-0 left-1/2"
              style={{ zIndex: index }}
            >
              <motion.div
                className="origin-bottom pointer-events-auto"
                initial={false}
                animate={{
                  // Hit target stays on the base fan pose — spread/lift are visual
                  // only, otherwise edge hover jitters as neighbors move.
                  x: pose.x - spec.w / 2,
                  y: pose.y - pose.depth,
                  rotate: pose.rotate,
                }}
                transition={fanTransition}
                onMouseEnter={() => setHover(index)}
                style={{
                  paddingTop: maxLift,
                  marginTop: -maxLift,
                }}
              >
                <motion.div
                  ref={(node) => {
                    const key = `${card.rank}${card.suit}`;
                    if (node) cardNodes.current.set(key, node);
                    else cardNodes.current.delete(key);
                  }}
                  className="origin-bottom"
                  initial={false}
                  animate={{ x: spread, y: -lift }}
                  transition={fanTransition}
                >
                  <DealIn delayMs={delayMs}>
                    <PlayingCard
                      card={card}
                      size={cardSize}
                      selected={picked === index}
                      disabled={ourTurn && !canPlay}
                      onClick={
                        ourTurn
                          ? () => {
                              if (!canPlay || pendingRef.current) return;
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
                      className="touch-manipulation"
                      liftOnHover={false}
                    />
                  </DealIn>
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </div>
      <PlayConfirmDock
        show={confirmToPlay && canPlaySelected}
        label="Play selected card"
        placement={confirmPlacement}
        onConfirm={() => {
          if (selectedCard) return playNow(selectedCard);
        }}
      >
        <Check className="size-4" strokeWidth={2.75} />
      </PlayConfirmDock>
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
  roomy = false,
}: {
  slot: "west" | "east";
  children: ReactNode;
  /** Wider/taller box so a readable dummy fan fits after rotation. */
  roomy?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center overflow-visible",
        // Pull the fan toward the name badge (indicator sits inside of E/W).
        slot === "east" ? "justify-end" : "justify-start",
        roomy && slot === "east" && "-mr-12 md:-mr-5",
        roomy && slot === "west" && "-ml-12 md:-ml-5",
        !roomy && slot === "east" && "-mr-4 md:mr-0",
        !roomy && slot === "west" && "-ml-4 md:ml-0",
        roomy
          ? "h-[min(70vh,30rem)] w-8 md:w-24"
          : "h-48 w-16 md:w-28 md:justify-center"
      )}
    >
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
            Add bot
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

function BidIndicator({ bid, tricks }: { bid: number | null; tricks: number }) {
  if (bid === null) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        className="pointer-events-auto text-[11px] leading-none font-semibold tabular-nums text-white/80 md:text-xs"
      >
        {tricks}
        <span className="text-white/30">/</span>
        {bid}
      </TooltipTrigger>
      <TooltipContent>{bidMadeLabel(bid, tricks)}</TooltipContent>
    </Tooltip>
  );
}

function bidMadeLabel(bid: number | null, tricks: number) {
  if (bid === null) return "No bid yet";
  const bidWord = bid === 1 ? "trick" : "tricks";
  return `Made ${tricks}, bid ${bid} ${bidWord}`;
}
