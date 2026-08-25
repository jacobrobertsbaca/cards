"use client"

import { Label } from "@/components/ui/label"
import { Segmented } from "@/components/segmented"
import { PatternEditor } from "@/components/pattern-editor"
import { ScoringFormulaEditor } from "@/components/scoring-formula"
import { validatePattern } from "@/lib/game/pattern"
import { validateExpression } from "@/lib/game/formula"
import type { GameSettings, LeadTrump } from "@/lib/game/types"
import { cn } from "@/lib/utils"

export function settingsErrors(settings: GameSettings) {
  return (
    validatePattern(settings.pattern, settings.seatCount) ||
    validateExpression(settings.scoring.made) ||
    validateExpression(settings.scoring.miss)
  )
}

export function GameSettingsFields({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: GameSettings
  onChange: (value: GameSettings) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div
      className={cn("space-y-8", disabled && "pointer-events-none opacity-55", className)}
      aria-disabled={disabled || undefined}
    >
      <section className="space-y-3">
        <Label>Players</Label>
        <Segmented
          value={value.seatCount}
          onChange={(seatCount) => onChange({ ...value, seatCount })}
          options={[2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
        />
      </section>

      <section className="space-y-3">
        <Label>Deal Pattern</Label>
        <p className="text-xs text-muted-foreground">Cards dealt each round.</p>
        <PatternEditor
          value={value.pattern}
          seatCount={value.seatCount}
          onChange={(pattern) => onChange({ ...value, pattern })}
        />
      </section>

      <section className="flex items-center justify-between gap-6">
        <div className="min-w-0 space-y-1">
          <Label>Lead trump</Label>
          <p className="text-xs leading-5 text-muted-foreground">
            {value.leadTrump === "always"
              ? "A player may lead trump on any trick."
              : "Trump can be led only after it has been broken."}
          </p>
        </div>
        <Segmented
          className="shrink-0"
          value={value.leadTrump}
          onChange={(leadTrump: LeadTrump) => onChange({ ...value, leadTrump })}
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
            {value.hook
              ? "The dealer cannot make the bids add up to the tricks."
              : "The dealer may bid any number."}
          </p>
        </div>
        <Segmented
          className="shrink-0"
          value={value.hook ? "on" : "off"}
          onChange={(hook) => onChange({ ...value, hook: hook === "on" })}
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
          value={value.scoring}
          onChange={(scoring) => onChange({ ...value, scoring })}
        />
      </section>
    </div>
  )
}
