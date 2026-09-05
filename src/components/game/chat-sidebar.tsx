"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmoteIcon } from "@/components/game/emote-icon";
import { useChatSession } from "@/components/game/chat-context";
import { CHAT_MAX_LENGTH, chatExactTime, chatTimeAgo } from "@/lib/chat";
import { EMOTE_LABELS, TABLE_EMOTES, type TableEmote } from "@/lib/emotes";
import type { ChatMessage } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SIDEBAR_HOVER_TRIGGER } from "@/components/sidebar";

export const CHAT_SIDEBAR_WIDTH = "w-64";
export const CHAT_SIDEBAR_EXPANDED_INSET = "16rem";
export const CHAT_SIDEBAR_RAIL_INSET = "2.5rem";

const ROW_HOVER =
  "rounded-md transition-colors hover:bg-white/10 active:bg-white/15";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40";

export function ChatSidebar({
  pinned,
  onPinnedChange,
}: {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}) {
  const session = useChatSession();
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const expanded = pinned || hovered;

  const messages = session?.messages ?? [];
  const canSend = session?.canSend ?? false;
  const onSend = session?.onSend;
  const onEmote = session?.onEmote;

  function openHover() {
    setHovered(true);
  }

  function closeHover(event: MouseEvent<HTMLDivElement>) {
    if (pinned) return;
    const panel = event.currentTarget;
    const related = event.relatedTarget;
    if (related instanceof Node && panel.contains(related)) return;

    // relatedTarget is often null or a portaled tooltip; confirm with hit-testing.
    const { clientX, clientY } = event;
    window.requestAnimationFrame(() => {
      if (pinned) return;
      const under = document.elementFromPoint(clientX, clientY);
      if (
        under &&
        (panel.contains(under) ||
          under.closest('[data-slot="tooltip-content"]'))
      ) {
        return;
      }
      setHovered(false);
    });
  }

  function togglePinned() {
    onPinnedChange(!pinned);
  }

  return (
    <>
      <div
        onMouseEnter={openHover}
        onMouseLeave={closeHover}
        className={cn(
          "fixed top-0 right-0 z-40 hidden h-svh overflow-hidden md:block",
          "transition-[width] duration-200 ease-out",
          expanded ? CHAT_SIDEBAR_WIDTH : "pointer-events-none w-10"
        )}
      >
        {!expanded && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-auto absolute inset-y-0 right-0 z-10",
              SIDEBAR_HOVER_TRIGGER
            )}
            onMouseEnter={openHover}
          />
        )}
        {/* Solid hit target so the cursor never “falls through” to the table. */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 border-l border-white/10 bg-[#10261d] shadow-2xl shadow-black/40 transition-opacity duration-200 ease-out",
            expanded ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />

        <div className="relative z-10 flex h-full w-full flex-col text-white">
          <div
            className={cn(
              "ml-auto flex w-10 shrink-0 justify-center p-1",
              !expanded && "pointer-events-auto"
            )}
            onMouseEnter={!expanded ? openHover : undefined}
          >
            <button
              type="button"
              onClick={togglePinned}
              aria-label={pinned ? "Unpin chat" : "Pin chat open"}
              title={pinned ? "Unpin chat" : "Pin chat"}
              aria-expanded={expanded}
              className={cn(
                "relative z-20 flex size-8 items-center justify-center rounded-md text-white/70 hover:text-white",
                ROW_HOVER,
                FOCUS_RING,
                pinned && "bg-white/15 text-white"
              )}
            >
              <MessageCircle
                className={cn("size-4", pinned && "fill-current")}
              />
            </button>
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-150 ease-out",
              expanded
                ? "pointer-events-auto opacity-100 delay-75"
                : "pointer-events-none opacity-0 delay-0"
            )}
          >
            <ChatBody
              messages={messages}
              canSend={canSend && Boolean(onSend)}
              onSend={onSend ?? (async () => {})}
              onEmote={onEmote ?? (() => {})}
              active={Boolean(session)}
              focusInput={expanded}
            />
          </div>
        </div>
      </div>

      <div className="fixed top-0 right-0 z-50 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="bg-[#16352b]/80 text-white backdrop-blur-md hover:bg-white/10 hover:text-white"
          onClick={() => setMobileOpen(true)}
          aria-label="Open chat"
        >
          <MessageCircle />
        </Button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          className="w-80 border-white/10 bg-[#10261d] p-0 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Chat</SheetTitle>
          </SheetHeader>
          <div className="flex h-full min-h-0 flex-col pt-2">
            <ChatBody
              messages={messages}
              canSend={canSend && Boolean(onSend)}
              onSend={onSend ?? (async () => {})}
              onEmote={onEmote ?? (() => {})}
              active={Boolean(session)}
              focusInput={mobileOpen}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ChatBody({
  messages,
  canSend,
  onSend,
  onEmote,
  active,
  focusInput,
}: {
  messages: ChatMessage[];
  canSend: boolean;
  onSend: (body: string) => void | Promise<void>;
  onEmote: (emote: TableEmote) => void;
  active: boolean;
  focusInput: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function scrollListToBottom() {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  function onListScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollListToBottom();
  }, [messages.length]);

  useEffect(() => {
    if (!focusInput) return;
    stickToBottomRef.current = true;
    scrollListToBottom();
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(tick);
  }, [focusInput]);

  useEffect(() => {
    if (!focusInput || !canSend) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusInput, canSend]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const single = window.matchMedia("(min-width: 768px)").matches ? 32 : 40;
    const max = 112;
    const from = el.offsetHeight || single;

    el.style.transition = "none";
    el.style.height = "auto";
    const to = !draft
      ? single
      : Math.min(Math.max(el.scrollHeight, single), max);
    el.style.height = `${from}px`;
    void el.offsetHeight;
    el.style.transition = "height 200ms ease-out";
    el.style.height = `${to}px`;
  }, [draft]);

  async function submit() {
    const body = draft.trim();
    if (!canSend || !body || busy) return;
    setBusy(true);
    stickToBottomRef.current = true;
    try {
      await onSend(body);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        onScroll={onListScroll}
        className="min-h-0 flex-1 overflow-y-auto px-2 scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-col gap-2.5 px-1 py-2 pb-3">
          {messages.length === 0 && (
            <p className="px-1 py-6 text-center text-[12px] text-white/35">
              {active
                ? "Be the first one to say hello!"
                : "Join a table to chat."}
            </p>
          )}
          {messages.map((message) => {
            const ago = chatTimeAgo(message.createdAt, now);
            const exact = chatExactTime(message.createdAt);
            const isState = message.kind === "state";
            return (
              <div key={message.id} className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-none">
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate font-medium",
                      isState ? "text-white/30" : "text-white/45"
                    )}
                  >
                    {message.playerName || "Player"}
                  </p>
                  {ago && (
                    <time
                      dateTime={message.createdAt}
                      title={exact}
                      className="shrink-0 cursor-default tabular-nums text-white/30"
                    >
                      {ago}
                    </time>
                  )}
                </div>
                <p
                  className={cn(
                    "wrap-break-word mt-1 text-[13px] leading-snug",
                    isState ? "text-white/40" : "text-white/90"
                  )}
                >
                  {message.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {canSend && (
          <div className="mb-1.5 grid grid-cols-4 gap-0.5">
            {TABLE_EMOTES.map((emote) => (
              <button
                key={emote}
                type="button"
                onClick={() => onEmote(emote)}
                aria-label={EMOTE_LABELS[emote]}
                title={EMOTE_LABELS[emote]}
                className={cn(
                  "flex h-9 items-center justify-center rounded-lg text-[1.25rem] text-white/90 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15",
                  FOCUS_RING
                )}
              >
                <EmoteIcon emote={emote} />
              </button>
            ))}
          </div>
        )}

        <form
          className="relative leading-0"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) =>
              setDraft(event.target.value.slice(0, CHAT_MAX_LENGTH))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            rows={1}
            maxLength={CHAT_MAX_LENGTH}
            disabled={!canSend || busy}
            placeholder={
              !active
                ? "Join a table to chat…"
                : canSend
                ? "Message the table…"
                : "Spectators can’t chat"
            }
            className={cn(
              "h-10 max-h-28 w-full resize-none overflow-y-auto rounded-lg border border-white/10 bg-white/5 py-2 pr-10 pl-2.5 text-base leading-5 text-white placeholder:text-white/30 md:h-8 md:py-1.5 md:pr-9 md:text-[13px]",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              FOCUS_RING,
              "disabled:opacity-50"
            )}
          />
          <button
            type="submit"
            disabled={!canSend || busy || !draft.trim()}
            aria-label="Send message"
            className={cn(
              "absolute right-0 bottom-0 mr-2 mb-2.5 md:mr-1.5 md:mb-1.5 flex size-5 items-center justify-center rounded-full p-0",
              "bg-white/20 text-white transition-colors hover:bg-white/30",
              "disabled:pointer-events-none disabled:bg-white/10 disabled:text-white/35",
              FOCUS_RING
            )}
          >
            <ArrowUp className="size-3.5" strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
