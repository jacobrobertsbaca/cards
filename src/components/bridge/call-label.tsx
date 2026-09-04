import type { ReactNode } from "react"
import { SUIT_GLYPH } from "@/lib/game/cards"
import type { BridgeCall, BridgeStrain } from "@/lib/bridge/types"
import { cn } from "@/lib/utils"

export function strainIsRed(strain: BridgeStrain) {
  return strain === "hearts" || strain === "diamonds"
}

export function StrainGlyph({
  strain,
  className,
}: {
  strain: BridgeStrain
  className?: string
}) {
  if (strain === "notrump") {
    return <span className={cn("font-semibold", className)}>NT</span>
  }
  return (
    <span
      className={cn(
        strainIsRed(strain) ? "text-red-400" : "text-white",
        className
      )}
    >
      {SUIT_GLYPH[strain]}
    </span>
  )
}

/** Colored call label for table chrome (white/red suits). */
export function CallLabel({
  call,
  className,
}: {
  call: BridgeCall
  className?: string
}) {
  if (call.type === "pass") {
    return <span className={cn("text-white/70", className)}>Pass</span>
  }
  if (call.type === "double") {
    return <span className={cn("font-semibold text-white", className)}>X</span>
  }
  if (call.type === "redouble") {
    return <span className={cn("font-semibold text-white", className)}>XX</span>
  }
  return (
    <span className={cn("inline-flex items-baseline gap-0.5", className)}>
      <span>{call.level}</span>
      <StrainGlyph strain={call.strain} />
    </span>
  )
}

/** Dark-on-light variant for tooltips / scoresheet. */
export function CallLabelInk({
  call,
  className,
}: {
  call: BridgeCall
  className?: string
}) {
  if (call.type === "pass") {
    return <span className={className}>Pass</span>
  }
  if (call.type === "double") {
    return <span className={cn("font-semibold", className)}>X</span>
  }
  if (call.type === "redouble") {
    return <span className={cn("font-semibold", className)}>XX</span>
  }
  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <span>{call.level}</span>
      {call.strain === "notrump" ? (
        <span className="font-semibold">NT</span>
      ) : (
        <span
          className={
            strainIsRed(call.strain) ? "text-[#c43b3b]" : "text-neutral-900"
          }
        >
          {SUIT_GLYPH[call.strain]}
        </span>
      )}
    </span>
  )
}

export function formatCallPlain(call: BridgeCall): string {
  if (call.type === "pass") return "Pass"
  if (call.type === "double") return "X"
  if (call.type === "redouble") return "XX"
  const strain =
    call.strain === "notrump" ? "NT" : SUIT_GLYPH[call.strain]
  return `${call.level}${strain}`
}

export function contractMarkup(
  level: number,
  strain: BridgeStrain,
  doubles: 0 | 1 | 2 = 0
): ReactNode {
  return (
    <span className="inline-flex items-baseline">
      <span>{level}</span>
      <StrainGlyph strain={strain} />
      {doubles > 0 && (
        <span className="ml-0.5 font-semibold">{"X".repeat(doubles)}</span>
      )}
    </span>
  )
}
