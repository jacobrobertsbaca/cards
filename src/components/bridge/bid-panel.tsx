"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { legalBridgeCalls } from "@/lib/bridge/engine";
import type { BridgeCall, BridgeState, BridgeStrain } from "@/lib/bridge/types";
import { SUIT_GLYPH } from "@/lib/game/cards";
import { cn } from "@/lib/utils";
import { PopConfirmButton } from "@/components/game/pop-confirm";

const LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
const STRAINS: BridgeStrain[] = [
  "clubs",
  "diamonds",
  "hearts",
  "spades",
  "notrump",
];

function strainLabel(strain: BridgeStrain) {
  if (strain === "notrump") return "NT";
  return SUIT_GLYPH[strain];
}

function strainClass(strain: BridgeStrain) {
  if (strain === "hearts" || strain === "diamonds") return "text-red-600";
  return "text-[#16352b]";
}

function callKey(call: BridgeCall): string {
  if (call.type === "bid") return `bid:${call.level}:${call.strain}`;
  return call.type;
}

function sameCall(a: BridgeCall, b: BridgeCall) {
  return callKey(a) === callKey(b);
}

function callLabel(call: BridgeCall) {
  if (call.type === "pass") return "Pass";
  if (call.type === "double") return "Double";
  if (call.type === "redouble") return "Redouble";
  return `${call.level}${strainLabel(call.strain)}`;
}

/** Which double action the auction is poised for (label even when grayed). */
function pendingDoubleKind(auction: BridgeCall[]): "double" | "redouble" {
  for (let i = auction.length - 1; i >= 0; i--) {
    const call = auction[i];
    if (call.type === "pass") continue;
    if (call.type === "redouble") return "double";
    if (call.type === "double") return "redouble";
    return "double";
  }
  return "double";
}

function firstLegalBid(
  legal: BridgeCall[]
): Extract<BridgeCall, { type: "bid" }> | null {
  for (const level of LEVELS) {
    for (const strain of STRAINS) {
      const call = { type: "bid" as const, level, strain };
      if (legal.some((item) => sameCall(item, call))) return call;
    }
  }
  return null;
}

const BID_ROW_SPRING = {
  type: "spring" as const,
  stiffness: 520,
  damping: 32,
  mass: 0.7,
};

const BID_ROW_GLASS = {
  initial: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    WebkitBackdropFilter: "blur(0px)",
  },
  animate: {
    opacity: 1,
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
  },
  exit: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    WebkitBackdropFilter: "blur(0px)",
  },
};

export function BridgeBidPanel({
  state,
  seat,
  onCall,
}: {
  state: BridgeState;
  seat: number;
  onCall: (call: BridgeCall) => void | Promise<void>;
}) {
  const legal = legalBridgeCalls(state, seat);
  const [picked, setPicked] = useState<BridgeCall | null>(null);
  const [pending, setPending] = useState(false);

  function isLegal(call: BridgeCall) {
    return legal.some((item) => sameCall(item, call));
  }

  const canBid = legal.some((call) => call.type === "bid");
  const canPass = isLegal({ type: "pass" });
  const canDouble = isLegal({ type: "double" });
  const canRedouble = isLegal({ type: "redouble" });
  const doubleKind = pendingDoubleKind(state.auction);
  const doubleCall: BridgeCall = { type: doubleKind };
  const canUseDouble = doubleKind === "redouble" ? canRedouble : canDouble;
  const bidding = picked?.type === "bid";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(13.5rem+env(safe-area-inset-bottom,0px))] z-40 flex justify-center px-2 md:bottom-[15rem]">
      <div
        className={cn(
          "pointer-events-auto relative flex w-fit flex-col items-center",
          pending && "pointer-events-none opacity-55"
        )}
      >
        <AnimatePresence initial={false}>
          {bidding && (
            <motion.div
              key="bid-rows"
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              exit={{ y: 12 }}
              transition={BID_ROW_SPRING}
              className="absolute bottom-full left-1/2 mb-1 flex w-max -translate-x-1/2 flex-col items-center gap-1"
            >
              <motion.div
                {...BID_ROW_GLASS}
                transition={BID_ROW_SPRING}
                className="flex w-fit items-center gap-0.5 rounded-full bg-black/25 p-1 md:gap-1 md:p-1.5"
              >
                {LEVELS.map((level) => {
                  const legalAtLevel = STRAINS.some((strain) =>
                    isLegal({ type: "bid", level, strain })
                  );
                  const selected =
                    picked?.type === "bid" && picked.level === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={!legalAtLevel || pending}
                      aria-pressed={selected}
                      onClick={() => {
                        if (picked?.type !== "bid") return;
                        const strain = isLegal({
                          type: "bid",
                          level,
                          strain: picked.strain,
                        })
                          ? picked.strain
                          : STRAINS.find((s) =>
                              isLegal({ type: "bid", level, strain: s })
                            ) ?? picked.strain;
                        setPicked({ type: "bid", level, strain });
                      }}
                      className={cn(
                        "flex size-8 touch-manipulation items-center justify-center rounded-full text-sm transition-colors md:size-9",
                        !legalAtLevel &&
                          "cursor-not-allowed text-white opacity-25",
                        legalAtLevel &&
                          !selected &&
                          "text-white hover:bg-white/20",
                        selected && "bg-white text-[#16352b] shadow-sm"
                      )}
                    >
                      {level}
                    </button>
                  );
                })}
              </motion.div>

              <motion.div
                {...BID_ROW_GLASS}
                transition={BID_ROW_SPRING}
                className="flex w-fit items-center gap-0.5 rounded-full bg-black/25 p-1 md:gap-1 md:p-1.5"
              >
                {STRAINS.map((strain) => {
                  const level = picked.type === "bid" ? picked.level : 1;
                  const call: BridgeCall = { type: "bid", level, strain };
                  const legalStrain = isLegal(call);
                  const selected =
                    picked.type === "bid" && picked.strain === strain;
                  return (
                    <button
                      key={strain}
                      type="button"
                      disabled={!legalStrain || pending}
                      aria-pressed={selected}
                      onClick={() => {
                        if (picked.type !== "bid") return;
                        setPicked({ type: "bid", level: picked.level, strain });
                      }}
                      className={cn(
                        "flex h-8 min-w-8 touch-manipulation items-center justify-center rounded-full px-2 text-sm transition-colors md:h-9 md:min-w-9",
                        !legalStrain &&
                          "cursor-not-allowed text-white opacity-25",
                        legalStrain &&
                          !selected &&
                          "text-white hover:bg-white/20",
                        selected && "bg-white shadow-sm",
                        selected && strainClass(strain)
                      )}
                    >
                      {strainLabel(strain)}
                    </button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex w-fit items-center gap-1.5">
          <div className="flex w-fit items-center gap-1 rounded-full bg-black/25 p-1 backdrop-blur-sm md:p-1.5">
            <button
              type="button"
              disabled={pending || !canBid}
              aria-pressed={bidding}
              onClick={() => {
                const next = firstLegalBid(legal);
                if (!next) return;
                setPicked(next);
              }}
              className={cn(
                "flex h-8 touch-manipulation items-center justify-center rounded-full px-3 text-xs font-medium transition-colors md:h-9 md:text-sm",
                !canBid && "cursor-not-allowed text-white opacity-25",
                canBid && !bidding && "text-white hover:bg-white/20",
                bidding && "bg-white text-[#16352b] shadow-sm"
              )}
            >
              Bid
            </button>
            <button
              type="button"
              disabled={pending || !canPass}
              aria-pressed={picked?.type === "pass"}
              onClick={() => setPicked({ type: "pass" })}
              className={cn(
                "flex h-8 touch-manipulation items-center justify-center rounded-full px-3 text-xs font-medium transition-colors md:h-9 md:text-sm",
                !canPass && "cursor-not-allowed text-white opacity-25",
                canPass &&
                  picked?.type !== "pass" &&
                  "text-white hover:bg-white/20",
                picked?.type === "pass" && "bg-white text-[#16352b] shadow-sm"
              )}
            >
              Pass
            </button>
            <button
              type="button"
              disabled={pending || !canUseDouble}
              aria-pressed={picked !== null && sameCall(picked, doubleCall)}
              onClick={() => setPicked(doubleCall)}
              className={cn(
                "flex h-8 touch-manipulation items-center justify-center rounded-full px-3 text-xs font-medium transition-colors md:h-9 md:text-sm",
                !canUseDouble && "cursor-not-allowed text-white opacity-25",
                canUseDouble &&
                  !(picked !== null && sameCall(picked, doubleCall)) &&
                  "text-white hover:bg-white/20",
                picked !== null &&
                  sameCall(picked, doubleCall) &&
                  "bg-white text-[#16352b] shadow-sm"
              )}
            >
              {callLabel(doubleCall)}
            </button>
          </div>
          <PopConfirmButton
            show={picked !== null}
            label={picked ? `Confirm ${callLabel(picked)}` : "Confirm call"}
            className="flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full bg-amber-200 text-[#16352b] shadow-[0_0_0_1px_rgb(251_191_36/0.45)] hover:bg-amber-100 md:size-9"
            onConfirm={async () => {
              if (!picked) return;
              setPending(true);
              try {
                await onCall(picked);
              } catch (error) {
                setPending(false);
                throw error;
              }
            }}
          >
            <Check className="size-3.5 md:size-4" strokeWidth={2.75} />
          </PopConfirmButton>
        </div>
      </div>
    </div>
  );
}
