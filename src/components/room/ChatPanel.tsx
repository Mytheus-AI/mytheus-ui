"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { mockRoomChat, type ChatMessage } from "@/lib/mock/data";

/* In-meeting chat. Same behaviour as before the redesign: seeded from the mock thread, a sent
   message is appended locally and nothing is transmitted. The composer is pinned under a scrolling
   list that follows the newest message. */

const ME = "Yash Maurya";

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockRoomChat);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: `ch_local_${m.length}`, from: ME, at: "now", text }]);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <ul
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5"
      >
        {messages.map((m) => {
          const me = m.from === ME;
          return (
            <li key={m.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
              <Avatar name={m.from} size="sm" />
              <div className="min-w-0">
                <p className="flex items-baseline gap-2 text-[13px]">
                  <span className="font-semibold text-ink">{me ? "You" : m.from}</span>
                  <span className="text-[12px] tabular-nums text-ink-3">{m.at}</span>
                </p>
                <p
                  className={`mt-0.5 break-words text-[14px] leading-snug ${
                    me
                      ? "inline-block rounded-pill bg-signal-soft px-3 py-2 text-ink"
                      : "text-ink-2"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <form
        onSubmit={send}
        autoComplete="off"
        className="flex shrink-0 items-center gap-2 border-t border-line bg-surface p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the room"
          aria-label="Message the room"
          className="h-10 min-w-0 flex-1 rounded-pill border border-line bg-surface px-4 text-[14px] text-ink placeholder:text-ink-3 focus-visible:border-signal"
        />
        <button
          type="submit"
          aria-label="Send message"
          title="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-signal text-white transition-[background-color,transform] duration-150 hover:bg-signal-deep focus-visible:!rounded-pill active:scale-95 motion-reduce:transition-none"
        >
          <PaperPlaneTilt size={18} weight="fill" aria-hidden />
        </button>
      </form>
    </div>
  );
}
