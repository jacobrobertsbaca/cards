"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Viewport-fixed confirm — portals out of transformed seat ancestors. */
export function PlayConfirmDock({
  show,
  label,
  onConfirm,
  children,
  placement = "south",
}: {
  show: boolean
  label: string
  onConfirm: () => void | Promise<void>
  children: ReactNode
  placement?: "south" | "north" | "east" | "west"
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed z-40",
        placement === "south" &&
          "bottom-[calc(13.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 md:bottom-[calc(12rem+env(safe-area-inset-bottom,0px))]",
        placement === "north" &&
          "top-[calc(13.25rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 md:top-[calc(14.75rem+env(safe-area-inset-top,0px))]",
        placement === "east" &&
          "top-1/2 right-[max(4.5rem,env(safe-area-inset-right))] -translate-y-1/2",
        placement === "west" &&
          "top-1/2 left-[max(4.5rem,env(safe-area-inset-left))] -translate-y-1/2"
      )}
    >
      <PopConfirmButton
        show={show}
        label={label}
        className="pointer-events-auto flex size-9 touch-manipulation items-center justify-center rounded-full bg-amber-200 text-[#16352b] shadow-[0_0_0_1px_rgb(251_191_36/0.45)] hover:bg-amber-100"
        onConfirm={onConfirm}
      >
        {children}
      </PopConfirmButton>
    </div>,
    document.body
  )
}

export function PopConfirmButton({
  show,
  label,
  className,
  onConfirm,
  children,
}: {
  show: boolean
  label: string
  className?: string
  onConfirm: () => void | Promise<void>
  children: ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const confirmRef = useRef(onConfirm)
  confirmRef.current = onConfirm

  useEffect(() => {
    if (!show) {
      busyRef.current = false
      setBusy(false)
    }
  }, [show])

  async function handleClick() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await confirmRef.current()
    } catch {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="pop-confirm"
          type="button"
          aria-label={label}
          aria-busy={busy}
          disabled={busy}
          initial={{ opacity: 0, scale: 0.45, rotate: -18 }}
          animate={{
            opacity: busy ? 0.55 : 1,
            scale: 1,
            rotate: 0,
            transition: { type: "spring", stiffness: 620, damping: 16, mass: 0.7 },
          }}
          exit={{
            opacity: [1, 1, 0],
            scale: [1, 1.15, 0.4],
            rotate: [0, 8, -18],
            transition: {
              type: "tween",
              duration: 0.32,
              times: [0, 0.28, 1],
              ease: "easeIn",
            },
          }}
          style={{ transformOrigin: "center" }}
          onClick={() => void handleClick()}
          className={cn(
            "disabled:pointer-events-none disabled:opacity-55",
            className
          )}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin md:size-4" strokeWidth={2.75} />
          ) : (
            children
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
