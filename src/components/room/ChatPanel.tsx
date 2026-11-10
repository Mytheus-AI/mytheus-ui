"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, PaperPlaneRight, WarningCircle } from "@phosphor-icons/react";
import { initials, toneOf } from "@/components/room/tone";
import { useRoomName } from "@/lib/realtime/room-names";
import { unreadCount, type ChatItem, type ChatState } from "@/lib/realtime/chat";

/* In-meeting chat, the Chat tab of the room's panel (and the chat column of the Notes view).

   It travels through the meeting link (`realtime-gateway`), which shows it to everyone at once and
   stores it in the meeting (polish program, Phase 0; it used to be LiveKit data only and lost).
   So people who join later see the conversation, it comes back after a reconnect, and agents can
   read it. Your message shows at once; if it reached the room but could not be stored it says so,
   and if it did not go out at all it offers Send again. */

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const MAX_CHARS = 2000;

function at(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : timeFormat.format(d);
}

export function ChatPanel({
  id,
  chat,
  connected,
  visible,
  onSend,
  onSeen,
}: {
  id?: string;
  chat: ChatState;
  /** The meeting link is joined: sending works. */
  connected: boolean;
  /** This panel is on screen, so new messages count as seen. */
  visible: boolean;
  onSend: (text: string) => void;
  onSeen: () => void;
}) {
  const nameOf = useRoomName();
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const unread = unreadCount(chat);

  useEffect(() => {
    if (visible && unread > 0) onSeen();
  }, [visible, unread, onSeen]);

  // Follow the conversation, unless you scrolled up to read something earlier.
  const atBottom = useRef(true);
  useEffect(() => {
    const el = bodyRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [chat.items.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
    atBottom.current = true;
  };

  const who = (m: ChatItem) => (m.mine ? "You" : nameOf(m.senderId, "Someone"));

  return (
    <div className="chat" id={id}>
      <div
        className="chat-body"
        ref={bodyRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {chat.items.length === 0 ? (
          <p className="chat-empty">
            {connected
              ? "No messages yet. Messages are kept with the meeting, so people who join later can read them."
              : "Chat opens once you are connected to the meeting."}
          </p>
        ) : null}
        {chat.items.map((m) => (
          <div className={`cmsg${m.mine ? " is-sent" : ""}`} key={m.key}>
            {m.mine ? null : (
              <span className={`mx-av ${toneOf(m.senderId ?? m.key)}`} aria-hidden>
                {initials(who(m))}
              </span>
            )}
            <div className="cmsg-meta">
              <strong>{who(m)}</strong>
              <time dateTime={m.at}>{at(m.at)}</time>
            </div>
            <div className="cbubble">{m.content}</div>
            {m.mine && m.delivery !== "sent" ? (
              <p className={`cmsg-state is-${m.delivery}`}>
                {m.delivery === "sending" ? (
                  "Sending..."
                ) : (
                  <>
                    <WarningCircle size={13} weight="fill" aria-hidden />
                    {m.delivery === "unsaved"
                      ? "Everyone here saw it, but it was not saved for people who join later."
                      : "Not sent."}
                    {m.delivery === "failed" ? (
                      <button
                        type="button"
                        className="cmsg-retry tap"
                        disabled={!connected}
                        onClick={() => onSend(m.content)}
                      >
                        <ArrowClockwise size={12} weight="bold" aria-hidden />
                        Send again
                      </button>
                    ) : null}
                  </>
                )}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <form className="composer" onSubmit={send} autoComplete="off">
        <input
          type="text"
          className="composer-input"
          placeholder={connected ? "Message everyone" : "Chat opens when you are connected"}
          aria-label="Message everyone"
          disabled={!connected}
          maxLength={MAX_CHARS}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="comp-send tap tip-end" data-tip="Send" aria-label="Send message" disabled={!connected || !draft.trim()}>
          <PaperPlaneRight size={18} weight="fill" aria-hidden />
        </button>
      </form>
    </div>
  );
}
