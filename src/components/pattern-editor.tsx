"use client"

import { useRef, useState } from "react"
import {
  buildDown,
  buildUp,
  buildUpDown,
  parsePattern,
  patternLabel,
  samePattern,
  validatePattern,
} from "@/lib/game/pattern"
import { cn } from "@/lib/utils"

const PRESETS = [
  { label: "1…10…1", pattern: buildUpDown(10) },
  { label: "10…1", pattern: buildDown(10) },
  { label: "1…10", pattern: buildUp(10) },
]

const CHIP =
  "rounded-full border px-2.5 py-1 text-xs transition-colors outline-none"

export function PatternEditor({
  value,
  seatCount,
  onChange,
}: {
  value: number[]
  seatCount: number
  onChange: (value: number[]) => void
}) {
  const [draft, setDraft] = useState("")
  const [focused, setFocused] = useState(false)
  const skip = useRef(false)
  const custom = PRESETS.every((preset) => !samePattern(value, preset.pattern))
  const shown = focused ? draft : custom ? patternLabel(value) : ""

  function commit() {
    if (skip.current) {
      skip.current = false
      setDraft("")
      setFocused(false)
      return
    }
    const parsed = parsePattern(draft)
    if (parsed && !validatePattern(parsed, seatCount)) onChange(parsed)
    setDraft("")
    setFocused(false)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onChange(preset.pattern)}
          className={cn(
            CHIP,
            samePattern(value, preset.pattern)
              ? "border-white bg-white text-[#16352b]"
              : "border-white/35 text-white/80 hover:border-white/55 hover:text-white"
          )}
        >
          {preset.label}
        </button>
      ))}
      <label
        className={cn(
          CHIP,
          "inline-grid max-w-full cursor-text",
          custom && !focused
            ? "border-white bg-white text-[#16352b]"
            : focused
              ? "border-white text-white"
              : "border-white/35 text-white/80 hover:border-white/55 hover:text-white"
        )}
      >
        <span className="invisible col-start-1 row-start-1 whitespace-pre">
          {shown || "Custom"}
        </span>
        <input
          aria-label="Custom deal pattern"
          placeholder="Custom"
          value={shown}
          onFocus={() => {
            setDraft(custom ? patternLabel(value) : "")
            setFocused(true)
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              skip.current = true
              event.currentTarget.blur()
            }
          }}
          size={1}
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent placeholder:text-white/45 outline-none"
        />
      </label>
    </div>
  )
}
