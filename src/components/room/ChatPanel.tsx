"use client";

import { useEffect, useRef, useState } from "react";
import { RoomEvent, type RemoteParticipant, type Room } from "livekit-client";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { CollapseSection } from "@/components/call/CollapseSection";
import { useOrgContext } from "@/lib/org-context";
import type { ChatMessage } from "@/lib/mock/data";

/* In-meeting chat, as the design's "Live Chat" section. In a real call it travels over LiveKit's
   data channel (topic CHAT_TOPIC), so everyone connected sees it; it is not stored, so someone who
   joins later sees only what is sent after they arrive. The design's attachment button, reactions and typing indicator are left out. */

const CHAT_TOPIC = "mx-chat";
const enc = new TextEncoder();
const dec = new TextDecoder();
const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ChatPanel({
  id,
  room = null,
}: {
  id?: string;
  /** The connected LiveKit room; messages are sent and received over it. */
  room?: Room | null;
}) {
  const { user } = useOrgContext();
  const [messages, setMessages] = useState<(ChatMessage & { isNew?: boolean })[]>([]);
  // With no connected call there is nowhere to send to, so the composer waits.
  const offline = !room;

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (topic !== CHAT_TOPIC) return;
      try {
        const { text } = JSON.parse(dec.decode(payload)) as { text?: string };
        if (!text) return;
        const from = participant?.name || participant?.identity || "Guest";
        setMessages((m) => [...m, { id: `ch_${Date.now()}_${m.length}`, from, at: clock(), text, isNew: true }]);
      } catch {
        // Not one of our chat messages.
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || offline) return;
    void room.localParticipant
      .publishData(enc.encode(JSON.stringify({ text })), { reliable: true, topic: CHAT_TOPIC })
      .catch(() => undefined);
    setMessages((m) => [...m, { id: `ch_local_${m.length}`, from: user.name, at: clock(), text, isNew: true }]);
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
              placeholder={offline ? "Chat opens when you are connected" : "Message everyone"}
              aria-label="Message everyone"
              disabled={offline}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="comp-send tap" data-tip="Send" aria-label="Send message" disabled={offline}>
              <PaperPlaneRight size={15} weight="fill" aria-hidden />
            </button>
          </form>
        </div>
      </CollapseSection>
    </div>
  );
}
