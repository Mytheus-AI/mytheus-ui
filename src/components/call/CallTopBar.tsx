"use client";

import type { ReactNode } from "react";
import { LinkSimple, Notebook, SidebarSimple, Users, VideoCamera } from "@phosphor-icons/react";
import { Wordmark } from "@/components/site/Wordmark";
import { useCallToast } from "@/components/call/CallToast";

/* The call window's top bar. On the pre-join it is the wordmark and, at the end, whatever the
   page passes (a way back). In the room it adds the meeting title in the display serif with a
   compact "4 in call" chip beside it on the same line (the title gives way first and truncates;
   on a phone the chip shrinks to the people icon and the number), the Call / Notes switch, Share
   link and the panel toggle. The wordmark is not
   a link in the room: a stray click must never drop you out of a call. */

export type CallTopBarRoom = {
  title: string;
  inCall: number;
  invited: number;
  shareUrl: string;
  sideVisible: boolean;
  onToggleSide: () => void;
  /** Call keeps the video up front; Notes turns the room into the living document. */
  mode?: "call" | "notes";
  onMode?: (mode: "call" | "notes") => void;
  /** Keyboard shortcuts are on: name their keys in the tooltips. */
  shortcutsOn?: boolean;
  /** Beside the in-call chip: "3 agents listening" (In every meeting at once). */
  extra?: ReactNode;
};

export function CallTopBar({ room, end }: { room?: CallTopBarRoom; end?: ReactNode }) {
  const toast = useCallToast();

  return (
    <header className="cx-top">
      <span className="cx-brand">
        <Wordmark size={22} textClassName="text-[20px]" />
      </span>

      {room ? (
        <>
          <span className="cx-top-sep" aria-hidden="true" />
          <div className="cx-top-title">
            <h1 title={room.title}>{room.title}</h1>
            <span
              className="cx-incall"
              role="img"
              aria-label={`${room.inCall} in call${room.invited > room.inCall ? `, ${room.invited} invited` : ""}`}
              title={`${room.inCall} in call${room.invited > room.inCall ? `, ${room.invited} invited` : ""}`}
            >
              <Users size={14} weight="bold" aria-hidden />
              <span className="cx-incall-n" aria-hidden>
                {room.inCall}
              </span>
              <span className="cx-incall-label" aria-hidden>
                in call
              </span>
              {room.invited > room.inCall ? (
                <span className="cx-invited" aria-hidden>
                  , {room.invited} invited
                </span>
              ) : null}
            </span>
            {room.extra}
          </div>

          {room.mode && room.onMode ? (
            <div className="cx-modes" role="group" aria-label="Room view">
              <button
                type="button"
                aria-pressed={room.mode === "call"}
                className="tap tip-below"
                onClick={() => room.onMode?.("call")}
                data-tip={room.shortcutsOn ? "Call view (1)" : "Call view"}
              >
                <VideoCamera size={16} aria-hidden />
                <span>Call</span>
              </button>
              <button
                type="button"
                aria-pressed={room.mode === "notes"}
                className="tap tip-below"
                onClick={() => room.onMode?.("notes")}
                data-tip={room.shortcutsOn ? "Notes view (2)" : "Notes view"}
              >
                <Notebook size={16} aria-hidden />
                <span>Notes</span>
              </button>
            </div>
          ) : null}

          <div className="cx-top-end">
            <button
              type="button"
              className="cx-pill-btn tap tip-below"
              data-tip="Copy meeting link"
              aria-label="Copy meeting link"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(room.shareUrl)
                  .then(() => toast("Meeting link copied", "success"))
                  .catch(() => toast("Could not copy the link. Copy it from the address bar instead.", "error"));
              }}
            >
              <LinkSimple size={16} weight="bold" aria-hidden />
              <span className="cx-pill-label">Share link</span>
            </button>
            {room.mode === "notes" ? null : (
              <button
                type="button"
                className={`cx-icon-btn tap tip-below tip-end${room.sideVisible ? " is-on" : ""}`}
                onClick={room.onToggleSide}
                data-tip={room.sideVisible ? "Hide panel" : "Show panel"}
                aria-label="Side panel"
                aria-pressed={room.sideVisible}
              >
                <SidebarSimple size={18} mirrored aria-hidden />
              </button>
            )}
          </div>
        </>
      ) : end ? (
        <div className="cx-top-end">{end}</div>
      ) : null}
    </header>
  );
}
