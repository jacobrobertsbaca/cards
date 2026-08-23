"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GameRoom } from "@/components/game/game-room"
import { isGameCode } from "@/lib/codes"

function codeFromPath(pathname: string) {
  const segment = pathname.replace(/^\//, "").split("/")[0] ?? ""
  return isGameCode(segment) ? segment : null
}

function codeFromWindow() {
  if (typeof window === "undefined") return null
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  let path = window.location.pathname
  if (base && path.startsWith(base)) path = path.slice(base.length)
  return codeFromPath(path)
}

export default function NotFound() {
  const pathname = usePathname()
  const [code, setCode] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setCode(codeFromPath(pathname) ?? codeFromWindow())
    setReady(true)
  }, [pathname])

  if (!ready) return <div className="felt min-h-svh" />
  if (code) return <GameRoom code={code} />

  return (
    <main className="felt flex min-h-svh flex-col items-center justify-center gap-3 px-6">
      <p className="text-lg font-medium text-white">Nothing here</p>
      <Link href="/" className="text-sm text-white/60 underline-offset-4 hover:underline">
        Back to a new table
      </Link>
    </main>
  )
}
