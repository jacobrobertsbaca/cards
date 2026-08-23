"use client";

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

export function Scoreboard({ state }: { state: GameState }) {
  const standings = ranking(state);

  return (
    <Dialog>
      <DialogTrigger
        aria-label="Score sheet"
        className="pointer-events-auto absolute right-4 bottom-4 z-20 cursor-pointer text-right text-xs text-white/70 outline-none hover:text-white focus-visible:text-white"
      >
        {standings.map((row) => (
          <div key={row.seat} className="flex justify-end gap-3">
            <span>{row.name}</span>
            <span className="w-6 font-mono">{row.score}</span>
          </div>
        ))}
      </DialogTrigger>
      <DialogContent className="bg-[#f7f4ee] text-[#2c261e] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Scores</DialogTitle>
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
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 bg-[#f7f4ee] pr-3 pb-2 text-left text-xs font-normal text-[#6f675e]">
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
                <td className="py-1.5 pr-3 text-left font-mono text-xs text-[#6f675e]">
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
                          className="font-mono tabular-nums"
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
                "sticky bottom-0 bg-[#f7f4ee] pt-2 text-left font-medium",
                state.history.length > 0 && "border-t border-[#2c261e]/10"
              )}
            >
              Total
            </td>
            {standings.map((row) => (
              <td
                key={row.seat}
                className={cn(
                  "sticky bottom-0 bg-[#f7f4ee] px-2 pt-2 text-left font-mono font-medium tabular-nums",
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
  const made = tricks === 1 ? "1 trick" : `${tricks} tricks`;
  return `Bid ${bid}, made ${made}`;
}
