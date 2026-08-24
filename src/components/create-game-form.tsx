"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Segmented } from "@/components/segmented";
import { PatternEditor } from "@/components/pattern-editor";
import { ScoringFormulaEditor } from "@/components/scoring-formula";
import { gameCode } from "@/lib/codes";
import { createGame, joinGame } from "@/lib/game/engine";
import { getIdentity } from "@/lib/identity";
import { validatePattern, buildUpDown } from "@/lib/game/pattern";
import { validateExpression } from "@/lib/game/formula";
import {
  DEFAULT_FORMULA,
  type GameSettings,
  type LeadTrump,
} from "@/lib/game/types";
import { rememberGame } from "@/lib/history";
import { getGameStore } from "@/lib/store";
import { gameTooltip } from "@/lib/game/rules";

const items = [{ value: "oh-hell", label: "Oh Hell" }] as const;

export function CreateGameForm() {
  const router = useRouter();
  const [kind, setKind] = useState<GameSettings["kind"]>("oh-hell");
  const [seatCount, setSeatCount] = useState(2);
  const [pattern, setPattern] = useState(buildUpDown(10));
  const [leadTrump, setLeadTrump] = useState<LeadTrump>("after-broken");
  const [hook, setHook] = useState(true);
  const [scoring, setScoring] = useState(DEFAULT_FORMULA);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patternError = validatePattern(pattern, seatCount);
  const formulaError =
    validateExpression(scoring.made) || validateExpression(scoring.miss);

  async function onCreate() {
    if (patternError || formulaError) return;
    setBusy(true);
    setError(null);
    try {
      const settings = {
        kind,
        seatCount,
        pattern,
        leadTrump,
        hook,
        scoring,
      };
      const code = gameCode();
      const identity = getIdentity();
      const state = joinGame(createGame(settings), identity.id, identity.name);
      await getGameStore().create({ code, kind, state });
      rememberGame({
        code,
        kind,
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
      <section className="space-y-3">
        <Label>Game</Label>
        <Select
          value={kind}
          onValueChange={(value) =>
            value && setKind(value as GameSettings["kind"])
          }
          items={items}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Games</SelectLabel>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
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
        <Label>Deal Pattern</Label>
        <p className="text-xs text-muted-foreground">Cards dealt each round.</p>
        <PatternEditor
          value={pattern}
          seatCount={seatCount}
          onChange={setPattern}
        />
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
        <div className="space-y-1">
          <Label>Scoring</Label>
          <p className="text-xs text-muted-foreground">
            Click to edit each score.
          </p>
        </div>
        <ScoringFormulaEditor value={scoring} onChange={setScoring} />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <Button
          size="lg"
          onClick={() => void onCreate()}
          disabled={busy || Boolean(patternError || formulaError)}
        >
          {busy ? "Creating" : "Create game"}
        </Button>
      </div>
    </div>
  );
}
