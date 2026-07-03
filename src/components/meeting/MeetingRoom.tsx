"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentSidebar } from "@/components/sidebar/AgentSidebar";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  mockRoomParticipants,
  mockCaptions,
  mockRoomChat,
  type Meeting,
  type ChatMessage,
} from "@/lib/mock/data";

/* The meeting room shell — video-grid mock, live-caption strip, controls,
   and a tabbed right rail (Agent sidebar / in-meeting chat). All presentation
   on mock data: LiveKit video and the Socket.io agent stream are a later
   phase; this screen defines the layout, color, and interaction contract
   they'll render into. Controls toggle locally so the room feels inhabited,
   nothing is transmitted anywhere. */

export function MeetingRoom({ meeting }: { meeting: Meeting }) {
  const [tab, setTab] = useState<"agent" | "chat">("agent");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);

  return (
    <div className="-mx-8 -my-8 flex h-[calc(100dvh-4rem)] min-h-[540px] bg-bg-2">
      {/* ---- main stage ---- */}
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        {/* header */}
        <div className="flex items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <Badge tone="danger">Live</Badge>
            <h1 className="truncate text-[16px] font-medium tracking-tight text-ink-display">
              {meeting.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
              {meeting.participants.length} in room
            </span>
            <Link
              href={`/meetings/${meeting.id}`}
              className="link-underline text-[12.5px] font-medium text-ink-2"
            >
              Meeting details
            </Link>
          </div>
        </div>

        {/* video grid */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {mockRoomParticipants.map((p) => (
            <div
              key={p.name}
              className={`relative flex min-h-[140px] items-center justify-center overflow-hidden rounded-card bg-pill ${
                p.speaking ? "ring-2 ring-signal" : ""
              }`}
            >
              {p.camOn ? (
                /* stand-in for the video feed: a soft radial "lit room" wash */
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(80% 90% at 50% 30%, rgba(217,119,87,0.18), transparent 70%)",
                  }}
                />
              ) : null}
              <Avatar name={p.name} size="lg" className="bg-white/10 text-white" />

              {/* name tag */}
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 rounded-full bg-black/35 py-1 pl-2 pr-3 backdrop-blur-sm">
                <span className={p.micOn ? "text-white/85" : "text-priority-high"}>
                  {p.micOn ? <MicIcon /> : <MicOffIcon />}
                </span>
                <span className="max-w-[160px] truncate text-[12px] font-medium text-white">
                  {p.name}
                </span>
                <span className="hidden text-[10.5px] text-white/55 sm:inline">{p.role}</span>
              </div>

              {p.speaking && (
                <span className="absolute right-2.5 top-2.5 flex items-end gap-[2px]" aria-label="Speaking">
                  {[0.5, 1, 0.7].map((h, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-signal"
                      style={{ height: `${8 + h * 8}px` }}
                    />
                  ))}
                </span>
              )}
              {!p.camOn && (
                <span className="absolute right-2.5 top-2.5 text-white/45">
                  <CamOffIcon />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* live captions */}
        {captionsOn && (
          <div className="mt-3 rounded-card border border-line bg-white/90 px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3">
              Live captions
            </p>
            <div className="mt-1.5 space-y-1">
              {mockCaptions.map((c, i) => {
                const latest = i === mockCaptions.length - 1;
                return (
                  <p
                    key={c.text}
                    className={`text-[13px] leading-snug ${latest ? "text-ink" : "text-ink-3"}`}
                  >
                    <span className="mr-2 font-mono text-[10px] uppercase tracking-wider text-signal-deep">
                      {c.speaker.split(" ")[0]}
                    </span>
                    {c.text}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* controls */}
        <div className="mt-3 flex items-center justify-center gap-2.5">
          <ControlButton
            label={micOn ? "Mute" : "Unmute"}
            active={micOn}
            onClick={() => setMicOn((v) => !v)}
          >
            {micOn ? <MicIcon /> : <MicOffIcon />}
          </ControlButton>
          <ControlButton
            label={camOn ? "Stop camera" : "Start camera"}
            active={camOn}
            onClick={() => setCamOn((v) => !v)}
          >
            {camOn ? <CamIcon /> : <CamOffIcon />}
          </ControlButton>
          <ControlButton label="Share screen" active onClick={() => {}}>
            <ShareIcon />
          </ControlButton>
          <ControlButton
            label={captionsOn ? "Hide captions" : "Show captions"}
            active={captionsOn}
            onClick={() => setCaptionsOn((v) => !v)}
          >
            <CaptionsIcon />
          </ControlButton>
          <Link
            href={`/meetings/${meeting.id}`}
            className="ml-2 inline-flex items-center gap-2 rounded-pill bg-priority-high px-5 py-2.5 text-[13px] font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            <LeaveIcon />
            Leave
          </Link>
        </div>
      </div>

      {/* ---- right rail: agent / chat ---- */}
      <aside className="hidden w-[360px] shrink-0 flex-col border-l border-line bg-bg lg:flex xl:w-[380px]">
        <div className="flex shrink-0 gap-1 border-b border-line p-2">
          {(
            [
              { key: "agent", label: "Your agent" },
              { key: "chat", label: "Chat" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                tab === t.key ? "bg-bg-2 text-ink" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {tab === "agent" ? <AgentSidebar /> : <ChatPanel />}
        </div>
      </aside>
    </div>
  );
}

/* ---------------- chat ---------------- */

function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockRoomChat);
  const [draft, setDraft] = useState("");

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: `ch_local_${m.length}`, from: "Yash Maurya", at: "now", text },
    ]);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <ul className="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-4">
        {messages.map((m) => (
          <li key={m.id} className="flex gap-2.5">
            <Avatar name={m.from} size="sm" />
            <div className="min-w-0">
              <p className="flex items-baseline gap-2">
                <span className="text-[12.5px] font-medium text-ink">{m.from}</span>
                <span className="font-mono text-[10px] tabular-nums text-ink-3">{m.at}</span>
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{m.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={send} className="flex shrink-0 items-center gap-2 border-t border-line p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the room"
          aria-label="Message the room"
          className="w-full rounded-pill border border-line bg-white px-4 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus-visible:border-signal"
        />
        <button
          type="submit"
          aria-label="Send"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-signal text-white transition-colors hover:bg-signal-deep"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

/* ---------------- controls + icons ---------------- */

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 place-items-center rounded-full border transition-colors ${
        active
          ? "border-line bg-white text-ink-2 hover:border-line-2"
          : "border-priority-high/30 bg-priority-high-soft text-priority-high"
      }`}
    >
      {children}
    </button>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="7.5" y="2.5" width="5" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5M7.5 17.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function MicOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="7.5" y="2.5" width="5" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5M7.5 17.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="m3.5 3 13 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function CamIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="2.5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="m12.5 8.5 5-2.5v8l-5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function CamOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="2.5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="m12.5 8.5 5-2.5v8l-5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m2.5 3 15 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="2.5" y="4" width="15" height="10.5" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 11.5V7m0 0L7.8 9.2M10 7l2.2 2.2M6.5 17.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CaptionsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 9.2a1.8 1.8 0 1 0 0 1.6M14.5 9.2a1.8 1.8 0 1 0 0 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function LeaveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M12.5 6.5v-2a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1v-2M8 10h9m0 0-2.5-2.5M17 10l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M3.5 10 17 3.5 13 16.5l-3-4.5-6.5-2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
