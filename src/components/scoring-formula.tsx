"use client"

import { useEffect, useRef, useState } from "react"
import {
  highlightMath,
  mathTokens,
  prettyExpression,
  validateExpression,
  type MathToken,
} from "@/lib/game/formula"
import type { ScoringFormula } from "@/lib/game/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const MATH = "whitespace-pre font-serif text-[1.05rem] leading-snug not-italic"

export function ScoringFormulaEditor({
  value,
  onChange,
}: {
  value: ScoringFormula
  onChange: (value: ScoringFormula) => void
}) {
  return (
    <div className="rounded-lg border border-white/15 bg-[linear-gradient(180deg,rgb(255_255_255/0.07),rgb(255_255_255/0.03))] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <div className="flex shrink-0 items-baseline gap-1.5 font-serif text-[1.05rem] leading-none text-white/85 not-italic">
          <span>Score</span>
          <span className="text-white/30">=</span>
        </div>
        <div className="flex min-w-0 flex-1 items-stretch gap-1.5">
          <SquareBrace />
          <div className="min-w-0 flex-1">
            <ScoringRow
              label="on made bid"
              value={value.made}
              placeholder="10 + t"
              ariaLabel="Score when bid is made"
              onChange={(made) => onChange({ ...value, made })}
            />
            <ScoringRow
              label="on missed bid"
              value={value.miss}
              placeholder="t"
              ariaLabel="Score when bid is missed"
              onChange={(miss) => onChange({ ...value, miss })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoringRow({
  label,
  value,
  placeholder,
  ariaLabel,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  ariaLabel: string
  onChange: (value: string) => void
}) {
  const error = validateExpression(value)

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-0.5">
      <MathField
        value={value}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        invalid={Boolean(error)}
        error={error}
        onChange={onChange}
      />
      <span className="shrink-0 font-serif text-[0.85rem] text-white/35">
        {label}
      </span>
    </div>
  )
}

function SquareBrace() {
  return (
    <div className="relative w-2 shrink-0 self-stretch" aria-hidden>
      <svg
        viewBox="0 0 8 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full text-white/40"
      >
        <path
          d="M6.5 2 H2.5 V98 H6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="square"
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

function MathLine({
  tokens,
  className,
}: {
  tokens: MathToken[]
  className?: string
}) {
  return (
    <span className={cn("flex items-baseline", MATH, className)}>
      {tokens.map((token, index) =>
        token.kind === "var" ? (
          <span key={`${token.name}-${index}`} className="italic text-amber-100/90">
            {token.name}
          </span>
        ) : (
          <span key={index} className="text-white/80">
            {token.value}
          </span>
        )
      )}
    </span>
  )
}

function MathField({
  value,
  onChange,
  ariaLabel,
  placeholder,
  invalid,
  error,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder: string
  invalid?: boolean
  error?: string | null
}) {
  const skipCommit = useRef(false)
  const stored = prettyExpression(value)
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(stored)
  const shown = focused ? draft : stored
  const tokens = shown ? (focused ? highlightMath(shown) : mathTokens(value)) : []

  useEffect(() => {
    if (!focused) setDraft(stored)
  }, [focused, stored])

  function commit(raw = draft) {
    const next = raw.trim() || value
    onChange(prettyExpression(next))
    setFocused(false)
  }

  return (
    <Tooltip open={focused}>
      <TooltipTrigger
        delay={0}
        render={
          <div
            data-math-field
            className={cn(
              "relative inline-grid min-w-10 max-w-full cursor-text items-baseline overflow-hidden",
              invalid &&
                "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-destructive/80"
            )}
            title={invalid ? error ?? undefined : undefined}
          />
        }
      >
        <span className={cn("invisible col-start-1 row-start-1", MATH)}>
          {shown || placeholder}
        </span>
        <span
          className={cn(
            "pointer-events-none absolute inset-0 col-start-1 row-start-1 text-white/30",
            MATH
          )}
          style={{ opacity: shown ? 0 : 1 }}
        >
          {placeholder}
        </span>
        <MathLine
          tokens={tokens}
          className="pointer-events-none col-start-1 row-start-1"
        />
        <input
          aria-label={ariaLabel}
          aria-invalid={invalid}
          value={focused ? draft : stored}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          size={1}
          onFocus={() => {
            setDraft(stored)
            setFocused(true)
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (skipCommit.current) {
              skipCommit.current = false
              setFocused(false)
              return
            }
            commit()
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              skipCommit.current = true
              setDraft(stored)
              event.currentTarget.blur()
            }
          }}
          className={cn(
            "col-start-1 row-start-1 w-full min-w-0 bg-transparent text-transparent caret-white outline-none selection:bg-amber-200/25",
            MATH
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="font-serif italic">t</span>
        {" is the number of tricks made"}
      </TooltipContent>
    </Tooltip>
  )
}
