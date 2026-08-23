"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import { PatternEditor } from "@/components/pattern-editor";
import { ScoringFormulaEditor } from "@/components/scoring-formula";
import { gameCode } from "@/lib/codes";
import { createGame } from "@/lib/game/engine";
import { validatePattern, buildUpDown } from "@/lib/game/pattern";
import { validateExpression } from "@/lib/game/formula";
import { DEFAULT_FORMULA, type LeadTrump } from "@/lib/game/types";
import { rememberGame } from "@/lib/history";
import { getGameStore, storeMode } from "@/lib/store";
import { gameTooltip } from "@/lib/game/rules";

export function CreateGameForm() {
  const router = useRouter();
  const [kind] = useState("oh-hell");
  const [seatCount, setSeatCount] = useState(4);
  const [pattern, setPattern] = useState(buildUpDown(10));
  const [leadTrump, setLeadTrump] = useState<LeadTrump>("after-broken");
  const [hook, setHook] = useState(true);
  const [scoring, setScoring] = useState(DEFAULT_FORMULA);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patternError = validatePattern(pattern, seatCount);
  const formulaError = scoring.cases
    .map((rule) => validateExpression(rule.expression))
    .find(Boolean);

  async function onCreate() {
    if (patternError || formulaError) return;
    setBusy(true);
    setError(null);
    try {
      const settings = {
        kind: "oh-hell" as const,
        seatCount,
        pattern,
        leadTrump,
        hook,
        scoring,
      };
      const code = gameCode();
      const state = createGame(settings);
      await getGameStore().create({ code, kind: "oh-hell", state });
      rememberGame({
        code,
        kind: "oh-hell",
        title: state.title,
        summary: gameTooltip(settings),
      });
      router.push(`/${code}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the game"
      );
      setBusy(false);
    }
  }

  return (
    <div className="felt-ui mx-auto w-full max-w-lg space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">New table</p>
        <h1 className="text-3xl font-medium tracking-tight">Oh Hell</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Bid exactly. Take exactly. Share a short link when you&apos;re ready.
        </p>
      </div>

      <section className="space-y-3">
        <Label>Game</Label>
        <Segmented
          value={kind}
          onChange={() => {}}
          options={[{ value: "oh-hell", label: "Oh Hell" }]}
        />
      </section>

      <section className="space-y-3">
        <Label>Players</Label>
        <Segmented
          value={seatCount}
          onChange={setSeatCount}
          options={[2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
        />
      </section>

      <section className="space-y-3">
        <Label>Pattern</Label>
        <p className="text-xs text-muted-foreground">Cards dealt each round.</p>
        <PatternEditor value={pattern} onChange={setPattern} />
      </section>

      <section className="flex items-center justify-between gap-6">
        <div className="min-w-0 space-y-1">
          <Label>Lead trump</Label>
          <p className="text-xs leading-5 text-muted-foreground">
            {leadTrump === "always"
              ? "A player may lead trump on any trick."
              : "Trump can be led only after it has been broken."}
          </p>
        </div>
        <Segmented
          className="shrink-0"
          value={leadTrump}
          onChange={setLeadTrump}
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
            {hook
              ? "The dealer cannot make the bids add up to the tricks."
              : "The dealer may bid any number."}
          </p>
        </div>
        <Segmented
          className="shrink-0"
          value={hook ? "on" : "off"}
          onChange={(value) => setHook(value === "on")}
          options={[
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
        />
      </section>

      <section className="space-y-3">
        <Label>Scoring</Label>
        <ScoringFormulaEditor value={scoring} onChange={setScoring} />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <Button
          size="lg"
          onClick={() => void onCreate()}
          disabled={busy || Boolean(patternError || formulaError)}
        >
          {busy ? "Opening…" : "Create table"}
        </Button>
      </div>
    </div>
  );
}
