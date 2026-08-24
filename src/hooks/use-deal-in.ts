"use client"

import { useLayoutEffect, useRef, useState } from "react"

export function useArrivingIndex(count: number, active?: boolean) {
  const prev = useRef<number | null>(null)
  const [arriving, setArriving] = useState(-1)

  useLayoutEffect(() => {
    if (!active) {
      prev.current = count
      setArriving(-1)
      return
    }
    const last = prev.current ?? 0
    if (count === last + 1) setArriving(count - 1)
    else if (count !== last) setArriving(-1)
    prev.current = count
  }, [active, count])

  return active ? arriving : -1
}

export function useDealIn(active: boolean) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    const el = ref.current
    const felt = el?.closest(".felt")
    if (!el || !felt) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    el.getAnimations().forEach((anim) => anim.cancel())
    el.style.transform = "none"

    const area = felt.getBoundingClientRect()
    const { x, y } = localTranslationTo(el, {
      x: area.left + area.width / 2,
      y: area.top + area.height / 2,
    })

    const anim = el.animate(
      [
        { transform: `translate3d(${x}px, ${y}px, 0) scale(0.72)` },
        { transform: "translate3d(0, 0, 0) scale(1)" },
      ],
      {
        duration: 240,
        easing: "cubic-bezier(0.22, 0.8, 0.28, 1)",
        fill: "both",
      }
    )
    const clear = () => {
      try {
        anim.commitStyles()
      } catch {
        /* ignore */
      }
      anim.cancel()
      el.style.transform = ""
    }
    void anim.finished.then(clear).catch(clear)

    return () => {
      anim.cancel()
      el.style.transform = ""
    }
  }, [active])

  return ref
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
