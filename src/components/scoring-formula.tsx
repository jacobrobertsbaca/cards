"use client"

import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/segmented"
import {
  conditionLabel,
  formulaExplanation,
  prettyExpression,
  validateExpression,
} from "@/lib/game/formula"
import type { FormulaCondition, ScoringFormula } from "@/lib/game/types"

const CONDITIONS: { value: FormulaCondition; label: string }[] = [
  { value: "eq", label: "b = t" },
  { value: "neq", label: "b ≠ t" },
  { value: "gt", label: "b > t" },
  { value: "lt", label: "b < t" },
  { value: "always", label: "else" },
]

export function ScoringPreview({ formula }: { formula: ScoringFormula }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/25 bg-white/10 px-4 py-3">
      <span className="font-mono text-sm text-white/75">score</span>
      <div className="relative pl-3">
        <span className="absolute top-1 left-0 bottom-1 w-px bg-foreground/20" />
        <span className="absolute top-1 left-0 h-px w-2 bg-foreground/20" />
        <span className="absolute bottom-1 left-0 h-px w-2 bg-foreground/20" />
        <div className="space-y-1.5">
          {formula.cases.map((rule) => (
            <div key={rule.id} className="flex items-baseline gap-4 font-mono text-sm text-white">
              <span className="min-w-24">{prettyExpression(rule.expression)}</span>
              <span className="text-xs text-white/75">
                {rule.condition === "always"
                  ? "otherwise"
                  : `if ${conditionLabel(rule.condition)}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ScoringFormulaEditor({
  value,
  onChange,
}: {
  value: ScoringFormula
  onChange: (value: ScoringFormula) => void
}) {
  return (
    <div className="space-y-3">
      <ScoringPreview formula={value} />
      <details className="group">
        <summary className="cursor-pointer list-none text-sm text-muted-foreground transition-colors hover:text-foreground">
          <span className="underline-offset-4 group-open:text-foreground">
            Edit scoring
          </span>
        </summary>
        <div className="mt-3 space-y-3">
          {value.cases.map((rule, index) => {
            const invalid = validateExpression(rule.expression)
            return (
              <div key={rule.id} className="flex flex-col gap-2 rounded-lg border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Segmented
                    value={rule.condition}
                    onChange={(condition) =>
                      onChange({
                        ...value,
                        cases: value.cases.map((item) =>
                          item.id === rule.id ? { ...item, condition } : item
                        ),
                      })
                    }
                    options={CONDITIONS}
                  />
                  {value.cases.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        onChange({
                          ...value,
                          cases: value.cases.filter((item) => item.id !== rule.id),
                        })
                      }
                    >
                      <Minus />
                    </Button>
                  )}
                </div>
                <Input
                  value={rule.expression}
                  aria-label={`Scoring expression ${index + 1}`}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      cases: value.cases.map((item) =>
                        item.id === rule.id
                          ? { ...item, expression: event.target.value }
                          : item
                      ),
                    })
                  }
                  className="font-mono"
                />
                {invalid && (
                  <p className="text-xs text-destructive">{invalid}</p>
                )}
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                cases: [
                  ...value.cases,
                  {
                    id: crypto.randomUUID(),
                    condition: "always",
                    expression: "t",
                  },
                ],
              })
            }
          >
            <Plus data-icon="inline-start" />
            Add case
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            {formulaExplanation(value)} Use <code>b</code> for bid and{" "}
            <code>t</code> for tricks.
          </p>
        </div>
      </details>
    </div>
  )
}
