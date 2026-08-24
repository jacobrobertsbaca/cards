"use client"

import { useEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import {
  highlightMath,
  isCatchAll,
  mathTokens,
  newFormulaCase,
  prettyCondition,
  prettyExpression,
  validateCondition,
  validateExpression,
  type MathToken,
} from "@/lib/game/formula"
import type { FormulaCase, ScoringFormula } from "@/lib/game/types"
import { cn } from "@/lib/utils"

const MATH = "whitespace-pre font-serif text-[1.05rem] leading-snug not-italic"

export function ScoringFormulaEditor({
  value,
  onChange,
}: {
  value: ScoringFormula
  onChange: (value: ScoringFormula) => void
}) {
  function update(id: string, patch: { expression?: string; condition?: string }) {
    onChange({
      ...value,
      cases: value.cases.map((rule) =>
        rule.id === id ? { ...rule, ...patch } : rule
      ),
    })
  }

  function addCase() {
    const next = newFormulaCase("b > t", "t")
    const cases = [...value.cases]
    const last = cases.at(-1)
    if (last && isCatchAll(last.condition)) cases.splice(-1, 0, next)
    else cases.push(next)
    onChange({ ...value, cases })
  }

  return (
    <div className="pt-3 pr-3">
      <div className="relative rounded-lg border border-white/15 bg-[linear-gradient(180deg,rgb(255_255_255/0.07),rgb(255_255_255/0.03))] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
        <button
          type="button"
          aria-label="Add case"
          onClick={addCase}
          className="absolute -top-3 -right-3 z-10 flex size-6 items-center justify-center rounded-full border border-white/25 bg-[#16352b] text-white/55 transition-colors hover:border-white/40 hover:text-white"
        >
          <Plus className="size-3" />
        </button>
        <div className="flex items-center gap-2 px-3.5 py-2.5 pr-3">
          <div className="flex shrink-0 items-baseline gap-1.5 font-serif text-[1.05rem] leading-none text-white/85 not-italic">
            <span>Score</span>
            <span className="text-white/30">=</span>
          </div>
          <div className="flex min-w-0 flex-1 items-stretch gap-1.5">
            <CurlyBrace />
            <div className="min-w-0 flex-1">
              <AnimatePresence initial={false}>
                {value.cases.map((rule, index) => (
                  <FormulaCaseRow
                    key={rule.id}
                    rule={rule}
                    index={index}
                    total={value.cases.length}
                    onUpdate={(patch) => update(rule.id, patch)}
                    onRemove={() =>
                      onChange({
                        ...value,
                        cases: value.cases.filter((item) => item.id !== rule.id),
                      })
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormulaCaseRow({
  rule,
  index,
  total,
  onUpdate,
  onRemove,
}: {
  rule: FormulaCase
  index: number
  total: number
  onUpdate: (patch: { expression?: string; condition?: string }) => void
  onRemove: () => void
}) {
  const [liveCond, setLiveCond] = useState(rule.condition)
  const showIf = liveCond.trim() !== "" && !isCatchAll(liveCond)
  const exprError = validateExpression(rule.expression)
  const condError = isCatchAll(rule.condition)
    ? null
    : validateCondition(rule.condition)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-1.5 py-0.5"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <MathField
          kind="expr"
          value={rule.expression}
          ariaLabel={`Score for case ${index + 1}`}
          placeholder="10 + t"
          invalid={Boolean(exprError)}
          error={exprError}
          onChange={(expression) => onUpdate({ expression })}
        />
        <AnimatePresence initial={false}>
          {showIf && (
            <motion.span
              key="if"
              layout
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="inline-block overflow-hidden whitespace-nowrap font-serif text-[0.85rem] text-white/35"
            >
              if
            </motion.span>
          )}
        </AnimatePresence>
        <MathField
          kind="cond"
          value={rule.condition}
          ariaLabel={`Condition for case ${index + 1}`}
          placeholder="otherwise"
          invalid={Boolean(condError)}
          error={condError}
          onChange={(condition) => onUpdate({ condition })}
          onLiveChange={setLiveCond}
        />
      </div>
      <button
        type="button"
        aria-label="Remove case"
        disabled={total <= 1}
        onClick={onRemove}
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
      >
        <Minus className="size-2.5" />
      </button>
    </motion.div>
  )
}

function CurlyBrace() {
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

function storedText(kind: "expr" | "cond", value: string) {
  if (kind === "cond" && isCatchAll(value)) return ""
  return kind === "expr" ? prettyExpression(value) : prettyCondition(value)
}

function MathField({
  kind,
  value,
  onChange,
  onLiveChange,
  ariaLabel,
  placeholder,
  invalid,
  error,
}: {
  kind: "expr" | "cond"
  value: string
  onChange: (value: string) => void
  onLiveChange?: (value: string) => void
  ariaLabel: string
  placeholder: string
  invalid?: boolean
  error?: string | null
}) {
  const skipCommit = useRef(false)
  const stored = storedText(kind, value)
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(stored)
  const shown = focused ? draft : stored
  const tokens = shown
    ? focused
      ? highlightMath(shown)
      : mathTokens(value, kind)
    : []

  useEffect(() => {
    if (!focused) setDraft(stored)
  }, [focused, stored])

  function setLive(next: string) {
    setDraft(next)
    onLiveChange?.(next)
  }

  function commit(raw = draft) {
    const next = raw.trim() || (kind === "cond" ? "otherwise" : value)
    const cleaned =
      kind === "expr" ? prettyExpression(next) : prettyCondition(next)
    onChange(cleaned)
    onLiveChange?.(cleaned)
    setFocused(false)
  }

  return (
    <motion.div
      layout
      data-math-field
      className={cn(
        "relative inline-grid min-w-10 max-w-full cursor-text items-baseline overflow-hidden",
        invalid && "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-destructive/80"
      )}
      title={invalid ? error ?? undefined : undefined}
    >
      <span className={cn("invisible col-start-1 row-start-1", MATH)}>
        {shown || placeholder}
      </span>
      <motion.span
        aria-hidden
        initial={false}
        animate={{ opacity: shown ? 0 : 1 }}
        transition={{ duration: 0.16 }}
        className={cn(
          "pointer-events-none absolute inset-0 col-start-1 row-start-1 text-white/30",
          MATH
        )}
      >
        {placeholder}
      </motion.span>
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
          setLive(stored)
          setFocused(true)
        }}
        onChange={(event) => setLive(event.target.value)}
        onBlur={() => {
          if (skipCommit.current) {
            skipCommit.current = false
            setFocused(false)
            onLiveChange?.(stored)
            return
          }
          commit()
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
          if (event.key === "Escape") {
            skipCommit.current = true
            setLive(stored)
            event.currentTarget.blur()
          }
        }}
        className={cn(
          "col-start-1 row-start-1 w-full min-w-0 bg-transparent text-transparent caret-white outline-none selection:bg-amber-200/25",
          MATH
        )}
      />
    </motion.div>
  )
}
