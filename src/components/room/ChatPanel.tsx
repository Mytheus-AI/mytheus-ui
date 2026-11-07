"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { CollapseSection } from "@/components/call/CollapseSection";
import { useOrgContext } from "@/lib/org-context";
import { mockRoomChat, type ChatMessage } from "@/lib/mock/data";

/* In-meeting chat, as the design's "Live Chat" section. Same behaviour as before: seeded from the
   mock thread, a sent message is appended locally and nothing is transmitted. The design's
   attachment button, reactions and typing indicator are left out (nothing backs them). */

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ChatPanel({ id }: { id?: string }) {
  const { user } = useOrgContext();
  const [messages, setMessages] = useState<(ChatMessage & { isNew?: boolean })[]>(mockRoomChat);
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: `ch_local_${m.length}`, from: user.name, at: "now", text, isNew: true }]);
    setDraft("");
  };

  return (
    <div className="livechat reveal" id={id} style={{ animationDelay: ".27s" }}>
      <CollapseSection title="Live Chat" countChip={<span className="count-chip">{messages.length}</span>}>
        <div className="chat-card">
          <div className="chat-body" ref={bodyRef} role="log" aria-live="polite" aria-label="Chat messages">
            {messages.length === 0 ? <p className="chat-empty">No messages yet.</p> : null}
            {messages.map((m) => {
              const me = m.from === user.name;
              return (
                <div className={`cmsg${me ? " is-sent" : ""}${m.isNew ? " is-new" : ""}`} key={m.id}>
                  <div className="cmsg-meta">
                    {me ? null : (
                      <span className="c-av cx-av" aria-hidden>
                        {initials(m.from)}
                      </span>
                    )}
                    <strong>{me ? "You" : m.from}</strong>
                    <span className="time">{m.at}</span>
                  </div>
                  {me ? <div className="cbubble-sent">{m.text}</div> : <div className="cbubble">{m.text}</div>}
                </div>
              );
            })}
          </div>

          <form className="composer" onSubmit={send} autoComplete="off">
            <input
              type="text"
              placeholder="Message everyone"
              aria-label="Message everyone"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="comp-send tap" data-tip="Send" aria-label="Send message">
              <PaperPlaneRight size={15} weight="fill" aria-hidden />
            </button>
          </form>
        </div>
      </CollapseSection>
    </div>
  );
}
