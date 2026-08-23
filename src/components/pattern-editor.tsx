"use client"

import { buildDown, buildUp, buildUpDown } from "@/lib/game/pattern"
import { cn } from "@/lib/utils"

const PRESETS = [
  { label: "1…10…1", pattern: buildUpDown(10) },
  { label: "1…7…1", pattern: buildUpDown(7) },
  { label: "10…1", pattern: buildDown(10) },
  { label: "1…10", pattern: buildUp(10) },
]

export function PatternEditor({
  value,
  onChange,
}: {
  value: number[]
  onChange: (value: number[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onChange(preset.pattern)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            same(value, preset.pattern)
              ? "border-white bg-white text-[#16352b]"
              : "border-white/35 text-white/80 hover:border-white/55 hover:text-white"
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

function same(a: number[], b: number[]) {
  return a.length === b.length && a.every((n, i) => n === b[i])
}
