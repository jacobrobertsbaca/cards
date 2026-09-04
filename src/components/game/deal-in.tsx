"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

export const DEAL_FLIGHT_MS = 200

export function DealIn({
  delayMs,
  children,
}: {
  /** When set, card flies in from the table center after this delay. */
  delayMs?: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const shouldFly = delayMs !== undefined && !reduceMotion
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    if (!shouldFly) {
      setFrom(null)
      return
    }
    const el = ref.current
    const felt = el?.closest(".felt")
    if (!el || !felt) {
      setFrom({ x: 0, y: 0 })
      return
    }
    const area = felt.getBoundingClientRect()
    setFrom(
      localTranslationTo(el, {
        x: area.left + area.width / 2,
        y: area.top + area.height / 2,
      })
    )
  }, [shouldFly])

  if (!shouldFly) {
    return <div className="inline-block origin-center">{children}</div>
  }

  if (!from) {
    return (
      <div ref={ref} className="inline-block origin-center opacity-0" aria-hidden>
        {children}
      </div>
    )
  }

  const delay = Math.max(0, delayMs ?? 0) / 1000
  const flight = DEAL_FLIGHT_MS / 1000

  return (
    <motion.div
      ref={ref}
      className="relative z-20 inline-block origin-center"
      initial={{ x: from.x, y: from.y, scale: 0.9, opacity: 0 }}
      animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      transition={{
        delay,
        type: "tween",
        duration: flight,
        ease: [0.22, 1, 0.36, 1],
        // Fade up over the flight so cards are clear in motion without a
        // dense opaque stack at the table center.
        opacity: {
          type: "tween",
          duration: flight * 0.75,
          delay,
          ease: "easeOut",
        },
      }}
      onAnimationComplete={() => {
        const el = ref.current
        if (!el) return
        el.style.transform = ""
        el.style.opacity = ""
      }}
    >
      {children}
    </motion.div>
  )
}

function localTranslationTo(el: HTMLElement, target: { x: number; y: number }) {
  const sample = (tx: number, ty: number) => {
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
    const box = el.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }

  const origin = sample(0, 0)
  const alongX = sample(100, 0)
  const alongY = sample(0, 100)
  el.style.transform = "none"

  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const e0x = (alongX.x - origin.x) / 100
  const e0y = (alongX.y - origin.y) / 100
  const e1x = (alongY.x - origin.x) / 100
  const e1y = (alongY.y - origin.y) / 100
  const det = e0x * e1y - e0y * e1x
  if (!Number.isFinite(det) || Math.abs(det) < 1e-6) return { x: dx, y: dy }
  return {
    x: (e1y * dx - e1x * dy) / det,
    y: (-e0y * dx + e0x * dy) / det,
  }
}
