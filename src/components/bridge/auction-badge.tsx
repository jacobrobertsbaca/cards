"use client";

import type {
  BridgeCall,
  BridgeState,
} from "@/lib/bridge/types";
import { BRIDGE_SEAT_COUNT } from "@/lib/bridge/types";
import { CallLabel, CallLabelInk, contractMarkup } from "./call-label";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function auctionSeat(dealer: number, callIndex: number) {
  return (dealer + 1 + callIndex) % BRIDGE_SEAT_COUNT;
}

export function callsForSeat(
  state: BridgeState,
  seatIndex: number
): BridgeCall[] {
  return state.auction.filter(
    (_, index) => auctionSeat(state.dealer, index) === seatIndex
  );
}

export function lastCallForSeat(
  state: BridgeState,
  seatIndex: number
): BridgeCall | null {
  const calls = callsForSeat(state, seatIndex);
  return calls[calls.length - 1] ?? null;
}

/** Highest bid currently on the table (ignores pass/X/XX). */
export function winningBid(state: BridgeState): {
  call: Extract<BridgeCall, { type: "bid" }>;
  seat: number;
} | null {
  for (let i = state.auction.length - 1; i >= 0; i--) {
    const call = state.auction[i];
    if (call.type === "bid") {
      return { call, seat: auctionSeat(state.dealer, i) };
    }
  }
  return null;
}

export function BridgeAuctionBadge({
  state,
  seatIndex,
}: {
  state: BridgeState;
  seatIndex: number;
}) {
  const history = callsForSeat(state, seatIndex);
  const last = history[history.length - 1] ?? null;
  const win = winningBid(state);
  const isWinner =
    last?.type === "bid" &&
    win !== null &&
    win.seat === seatIndex &&
    win.call.level === last.level &&
    win.call.strain === last.strain;

  if (!last) {
    return <span className="text-[11px] leading-none text-white/25 md:text-xs">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        className={cn(
          "pointer-events-auto text-[11px] leading-none md:text-xs",
          isWinner
            ? "font-bold text-amber-300 [text-shadow:0_0_10px_rgb(251_191_36/0.85),0_0_2px_rgb(251_191_36/0.9)]"
            : "font-semibold text-white/80"
        )}
      >
        <CallLabel call={last} />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {history.length === 0 ? (
          <p>No calls yet</p>
        ) : (
          <div className="space-y-1">
            <p className="text-[10px] tracking-wide text-background/60 uppercase">
              Auction
            </p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {history.map((call, index) => (
                <CallLabelInk
                  key={`${index}-${call.type}`}
                  call={call}
                  className={cn(
                    index === history.length - 1 && "font-semibold"
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function BridgePlayBadge({
  state,
  seatIndex,
  tricks,
}: {
  state: BridgeState;
  seatIndex: number;
  tricks: number;
}) {
  const contract = state.contract;
  if (contract && seatIndex === contract.declarer) {
    return (
      <Tooltip>
        <TooltipTrigger
          delay={200}
          className="pointer-events-auto text-[11px] leading-none font-semibold tabular-nums text-white/80 md:text-xs"
        >
          <span className="inline-flex items-baseline gap-1">
            {contractMarkup(contract.level, contract.strain, contract.doubles)}
            <span className="text-white/30">/</span>
            <span>{tricks}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>Declarer · {tricks} tricks</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <span className="text-[11px] leading-none font-semibold tabular-nums text-white/40 md:text-xs">
      {tricks}
    </span>
  );
}
