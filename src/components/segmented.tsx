"use client"

import { cn } from "@/lib/utils"

type Option<T extends string | number> = {
  value: T
  label: string
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-lg bg-muted p-1",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
