"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { TableEmote } from "@/lib/emotes"
import type { ChatMessage } from "@/lib/store"

export type ChatSession = {
  messages: ChatMessage[]
  canSend: boolean
  onSend: (body: string) => void | Promise<void>
  onEmote: (emote: TableEmote) => void
}

type ChatContextValue = {
  session: ChatSession | null
  setSession: (session: ChatSession | null) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<ChatSession | null>(null)
  const setSession = useCallback((next: ChatSession | null) => {
    setSessionState(next)
  }, [])
  const value = useMemo(() => ({ session, setSession }), [session, setSession])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatSession() {
  return useContext(ChatContext)?.session ?? null
}

export function useRegisterChat(session: ChatSession | null) {
  const setSession = useContext(ChatContext)?.setSession

  useEffect(() => {
    if (!setSession) return
    setSession(session)
  }, [session, setSession])

  useEffect(() => {
    if (!setSession) return
    return () => setSession(null)
  }, [setSession])
}
