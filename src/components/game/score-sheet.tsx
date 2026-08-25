"use client";

import { ClipboardList } from "lucide-react";
import { ranking } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ScoreDelta({ value }: { value: number }) {
  if (value === 0) return null;
  if (value > 0) {
    return <span className="text-emerald-600"> +{value}</span>;
  }
  return <> {value}</>;
}

export function Scoreboard({
  state,
  className,
}: {
  state: GameState;
  className?: string;
}) {
  const standings = ranking(state);

  return (
    <Dialog>
      <DialogTrigger
        aria-label="Score sheet"
        className={cn(
          "pointer-events-auto absolute right-[max(0.5rem,env(safe-area-inset-right))] bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 cursor-pointer text-white outline-none md:right-4 md:bottom-4 md:rounded-md md:px-2.5 md:py-1.5 md:hover:bg-white/10",
          className
        )}
      >
        <span className="hidden text-right text-xs md:block">
          {standings.map((row) => (
            <div key={row.seat} className="flex justify-end gap-3">
              <span>{row.name}</span>
              <span className="w-6 tabular-nums">{row.score}</span>
            </div>
          ))}
        </span>
        <span className="flex size-8 items-center justify-center rounded-md hover:bg-white/10 md:hidden">
          <ClipboardList className="size-4" />
        </span>
      </DialogTrigger>
      <DialogContent className="bg-[#f7f4ee] text-[#2c261e] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-sans">Scores</DialogTitle>
        </DialogHeader>
        <ScoreTable state={state} />
      </DialogContent>
    </Dialog>
  );
}

function ScoreTable({ state }: { state: GameState }) {
  const standings = ranking(state);

  return (
    <div className="max-h-[min(24rem,70vh)] overflow-auto">
      <table className="w-full min-w-max border-collapse font-sans text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-20 bg-[#f7f4ee] pr-3 pb-2 text-left text-sm font-medium text-[#6f675e] shadow-[2px_0_6px_-2px_rgb(44_38_30/0.16)]">
              Tricks
            </th>
            {standings.map((row) => (
              <th
                key={row.seat}
                className="sticky top-0 bg-[#f7f4ee] px-2 pb-2 text-left font-medium"
              >
                <span className="block truncate">{row.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.history.length === 0 ? (
            <tr>
              <td
                colSpan={standings.length + 1}
                className="py-6 text-center text-[#6f675e]"
              >
                No rounds yet
              </td>
            </tr>
          ) : (
            state.history.map((round, index) => (
              <tr key={index}>
                <td className="sticky left-0 z-10 bg-[#f7f4ee] py-1.5 pr-3 text-left text-sm tabular-nums text-[#6f675e] shadow-[2px_0_6px_-2px_rgb(44_38_30/0.16)]">
                  {round.cards}
                </td>
                {standings.map((row) => {
                  const bid = round.bids[row.seat];
                  const tricks = round.tricks[row.seat];
                  return (
                    <td key={row.seat} className="px-2 py-1.5 text-left">
                      <Tooltip>
                        <TooltipTrigger
                          delay={200}
                          className="tabular-nums"
                        >
                          {tricks}/{bid}
                          <ScoreDelta value={round.scores[row.seat]} />
                        </TooltipTrigger>
                        <TooltipContent>
                          {bidMadeLabel(bid, tricks)}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td
              className={cn(
                "sticky bottom-0 left-0 z-20 bg-[#f7f4ee] pt-2 text-left font-medium shadow-[2px_0_6px_-2px_rgb(44_38_30/0.16)]",
                state.history.length > 0 && "border-t border-[#2c261e]/10"
              )}
            >
              Total
            </td>
            {standings.map((row) => (
              <td
                key={row.seat}
                className={cn(
                  "sticky bottom-0 bg-[#f7f4ee] px-2 pt-2 text-left font-medium tabular-nums",
                  state.history.length > 0 && "border-t border-[#2c261e]/10"
                )}
              >
                {row.score}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function bidMadeLabel(bid: number, tricks: number) {
  const bidWord = bid === 1 ? "trick" : "tricks";
  return `Made ${tricks}, bid ${bid} ${bidWord}`;
}
