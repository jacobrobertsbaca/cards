"use client";

import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import { PatternEditor } from "@/components/pattern-editor";
import { ScoringFormulaEditor } from "@/components/scoring-formula";
import { validatePattern } from "@/lib/oh-hell/pattern";
import { validateExpression } from "@/lib/oh-hell/formula";
import type { GameSettings, LeadTrump } from "@/lib/game/types";
import { isBridgeSettings, isOhHellSettings } from "@/lib/game/types";
import type { OhHellSettings } from "@/lib/oh-hell/types";
import { cn } from "@/lib/utils";

export function settingsErrors(settings: GameSettings): string | null {
  if (isBridgeSettings(settings)) return null;
  if (!isOhHellSettings(settings)) return "Unknown game";
  return (
    validatePattern(settings.pattern, settings.seatCount) ||
    validateExpression(settings.scoring.made) ||
    validateExpression(settings.scoring.miss)
  );
}

export function GameSettingsFields({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: GameSettings;
  onChange: (value: GameSettings) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (isBridgeSettings(value)) {
    return (
      <div
        className={cn(
          "space-y-3",
          disabled && "pointer-events-none opacity-55",
          className
        )}
        aria-disabled={disabled || undefined}
      >
        <p className="text-sm text-muted-foreground">
          Rubber bridge for 4 players.{" "}
          <a
            href="https://en.wikipedia.org/wiki/Bridge_scoring#Rubber_bridge"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto underline underline-offset-3 hover:text-foreground"
          >
            Standard scoring rules
          </a>{" "}
          apply.
        </p>
      </div>
    );
  }

  if (!isOhHellSettings(value)) return null;

  const ohHell = value;
  const setOhHell = (next: OhHellSettings) => onChange(next);

  return (
    <div
      className={cn(
        "space-y-8",
        disabled && "pointer-events-none opacity-55",
        className
      )}
      aria-disabled={disabled || undefined}
    >
      <section className="space-y-3">
        <Label>Players</Label>
        <Segmented
          value={ohHell.seatCount}
          onChange={(seatCount) => setOhHell({ ...ohHell, seatCount })}
          options={[2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
        />
      </section>

      <section className="space-y-3">
        <Label>Deal Pattern</Label>
        <p className="text-xs text-muted-foreground">Cards dealt each round.</p>
        <PatternEditor
          value={ohHell.pattern}
          seatCount={ohHell.seatCount}
          onChange={(pattern) => setOhHell({ ...ohHell, pattern })}
        />
      </section>

      <section className="flex items-center justify-between gap-6">
        <div className="min-w-0 space-y-1">
          <Label>Lead trump</Label>
          <p className="text-xs leading-5 text-muted-foreground">
            {ohHell.leadTrump === "always"
              ? "A player may lead trump on any trick."
              : "Trump can be led only after it has been broken."}
          </p>
        </div>
        <Segmented
          className="shrink-0"
          value={ohHell.leadTrump}
          onChange={(leadTrump: LeadTrump) =>
            setOhHell({ ...ohHell, leadTrump })
          }
          options={[
            { value: "always", label: "Always" },
            { value: "after-broken", label: "After broken" },
          ]}
        />
      </section>

      <section className="flex items-center justify-between gap-6">
        <div className="min-w-0 space-y-1">
          <Label>Hook</Label>
          <p className="text-xs leading-5 text-muted-foreground">
            {ohHell.hook
              ? "The dealer cannot make the bids add up to the tricks."
              : "The dealer may bid any number."}
          </p>
        </div>
        <Segmented
          className="shrink-0"
          value={ohHell.hook ? "on" : "off"}
          onChange={(hook) => setOhHell({ ...ohHell, hook: hook === "on" })}
          options={[
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <Label>Scoring</Label>
          <p className="text-xs text-muted-foreground">
            Click to edit each score.
          </p>
        </div>
        <ScoringFormulaEditor
          value={ohHell.scoring}
          onChange={(scoring) => setOhHell({ ...ohHell, scoring })}
        />
      </section>
    </div>
  );
}
