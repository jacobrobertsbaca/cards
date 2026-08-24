"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
