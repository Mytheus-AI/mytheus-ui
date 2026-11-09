"use client";

import { LinkSimple, Notebook, SidebarSimple, Users, VideoCamera } from "@phosphor-icons/react";
import { LogoMark } from "@/components/Logo";
import { useCallToast } from "@/components/call/CallToast";

/* The call window's app bar. On the pre-join it is just the brand; in the room it adds the meeting
   title with who is here under it (one quiet line instead of two count chips), Share link and
   the panel toggle. */

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
};

export function CallTopBar({ room }: { room?: CallTopBarRoom }) {
  const toast = useCallToast();

  return (
    <header className="appbar">
      <span className="brand" aria-label="Mytheus">
        <span className="brand-mark">
          <LogoMark size={20} />
        </span>
        <span className="brand-name">Mytheus</span>
      </span>

      {room ? (
        <>
          <span className="cx-bar-sep meeting-only" aria-hidden="true" />
          <div className="cx-bar-title meeting-only">
            <h1 title={room.title}>{room.title}</h1>
            <p>
              <Users size={13} aria-hidden />
              {room.inCall} in call
              {room.invited > room.inCall ? <span> · {room.invited} invited</span> : null}
            </p>
          </div>

          {room.mode && room.onMode ? (
            <div className={`cx-modes meeting-only${room.mode === "notes" ? " is-notes" : ""}`} role="tablist" aria-label="Room view">
              <span className="cx-modes-thumb" aria-hidden="true" />
              <button
                type="button"
                role="tab"
                aria-selected={room.mode === "call"}
                className={`tap${room.mode === "call" ? " is-on" : ""}`}
                onClick={() => room.onMode?.("call")}
                data-tip="Call view (1)"
              >
                <VideoCamera size={15} aria-hidden />
                <span>Call</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={room.mode === "notes"}
                className={`tap${room.mode === "notes" ? " is-on" : ""}`}
                onClick={() => room.onMode?.("notes")}
                data-tip="Notes view (2)"
              >
                <Notebook size={15} aria-hidden />
                <span>Notes</span>
              </button>
            </div>
          ) : null}

          <div className="appbar-right">
            <button
              type="button"
              className="chip chip-btn tap meeting-only"
              data-tip="Copy meeting link"
              aria-label="Copy meeting link"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(room.shareUrl)
                  .then(() => toast("Meeting link copied"))
                  .catch(() => toast("Could not copy the link"));
              }}
            >
              <LinkSimple size={14} weight="bold" aria-hidden />
              <span className="chip-label">Share link</span>
            </button>
            <button
              type="button"
              className={`icon-shell tap meeting-only${room.sideVisible ? " is-on" : ""}${room.mode === "notes" ? " cx-hide" : ""}`}
              onClick={room.onToggleSide}
              data-tip={room.sideVisible ? "Collapse panel" : "Expand panel"}
              aria-label="Toggle side panel"
              aria-pressed={room.sideVisible}
            >
              <SidebarSimple size={16} mirrored aria-hidden />
            </button>
          </div>
        </>
      ) : null}
    </header>
  );
}
