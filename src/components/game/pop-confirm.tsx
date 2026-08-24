"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"

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
  onConfirm: () => void
  children: ReactNode
}) {
  const [clicked, setClicked] = useState(false)
  const pending = useRef(false)
  const confirmRef = useRef(onConfirm)
  confirmRef.current = onConfirm

  useEffect(() => {
    if (show) {
      pending.current = false
      setClicked(false)
    }
  }, [show])

  const open = show && !clicked

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (!pending.current) return
        pending.current = false
        confirmRef.current()
      }}
    >
      {open && (
        <motion.button
          key="pop-confirm"
          type="button"
          aria-label={label}
          initial={{ opacity: 0, scale: 0.45, rotate: -18 }}
          animate={{
            opacity: 1,
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
          onClick={() => {
            pending.current = true
            setClicked(true)
          }}
          className={className}
        >
          {children}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
