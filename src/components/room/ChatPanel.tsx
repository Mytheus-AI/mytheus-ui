"use client";

import { useEffect, useRef, useState } from "react";
import { RoomEvent, type RemoteParticipant, type Room } from "livekit-client";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { initials, toneOf } from "@/components/room/tone";
import { useOrgContext } from "@/lib/org-context";
import { useRoomName } from "@/lib/realtime/room-names";
import type { ChatMessage } from "@/lib/mock/data";

/* In-meeting chat, the Chat tab of the room's panel (and the chat column of the Notes view). In a
   real call it travels over LiveKit's data channel (topic CHAT_TOPIC), so everyone connected sees
   it; it is not stored, so someone who joins later sees only what is sent after they arrive.
   Attachments, reactions and a typing indicator are left out: nothing behind them exists. */

const CHAT_TOPIC = "mx-chat";
const enc = new TextEncoder();
const dec = new TextDecoder();
const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });


export function ChatPanel({
  id,
  room = null,
}: {
  id?: string;
  /** The connected LiveKit room; messages are sent and received over it. */
  room?: Room | null;
}) {
  const { user } = useOrgContext();
  // Read through a ref so the data listener (bound once per room) always names with the latest
  // member list instead of the one it closed over.
  const nameOf = useRoomName();
  const nameRef = useRef(nameOf);
  nameRef.current = nameOf;
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
        const from = participant?.name || nameRef.current(participant?.identity);
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
    <div className="chat" id={id}>
      <div className="chat-body" ref={bodyRef} role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 ? (
          <p className="chat-empty">
            {offline
              ? "Chat opens once you are connected to the call."
              : "No messages yet. Chat is not stored, so people who join later only see what is sent after they arrive."}
          </p>
        ) : null}
        {messages.map((m) => {
          const me = m.from === user.name;
          return (
            <div className={`cmsg${me ? " is-sent" : ""}`} key={m.id}>
              {me ? null : (
                <span className={`mx-av ${toneOf(m.from)}`} aria-hidden>
                  {initials(m.from)}
                </span>
              )}
              <div className="cmsg-meta">
                <strong>{me ? "You" : m.from}</strong>
                <time>{m.at}</time>
              </div>
              <div className="cbubble">{m.text}</div>
            </div>
          );
        })}
      </div>

      <form className="composer" onSubmit={send} autoComplete="off">
        <input
          type="text"
          className="composer-input"
          placeholder={offline ? "Chat opens when you are connected" : "Message everyone"}
          aria-label="Message everyone"
          disabled={offline}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="comp-send tap tip-end" data-tip="Send" aria-label="Send message" disabled={offline}>
          <PaperPlaneRight size={18} weight="fill" aria-hidden />
        </button>
      </form>
    </div>
  );
}
