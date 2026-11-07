"use client";

import { LinkSimple, SidebarSimple, UserCheck, Users } from "@phosphor-icons/react";
import { LogoMark } from "@/components/Logo";
import { useCallToast } from "@/components/call/CallToast";

/* The call window's app bar, ported from the meeting design. On the pre-join it is just the brand;
   in the room it adds the people counts, the meeting title, Share link and the panel toggle. */

export type CallTopBarRoom = {
  title: string;
  inCall: number;
  invited: number;
  shareUrl: string;
  sideVisible: boolean;
  onToggleSide: () => void;
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
          <span className="chip meeting-only">
            <Users size={14} aria-hidden />
            In call · <b>{room.inCall}</b>
          </span>
          <span className="chip meeting-only">
            <UserCheck size={14} aria-hidden />
            Invited · <b>{room.invited}</b>
          </span>
          <h1 className="appbar-title meeting-only">{room.title}</h1>

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
              className={`icon-shell tap meeting-only${room.sideVisible ? " is-on" : ""}`}
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
