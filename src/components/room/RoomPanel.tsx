"use client";

import type { ReactNode } from "react";
import { ChatCircle, Sparkle, Users, Warning } from "@phosphor-icons/react";

/* The design's side panel: the agent, the participants and the chat stacked in one scrolling
   column, each section collapsible. Collapsed, it becomes a thin rail of icons that keeps the
   counts and the conflict alert visible; each icon reopens the panel at its section. Under 960px
   the same panel sits under the stage as a bottom sheet, and the rail becomes a row.

   The sections stay mounted while the panel is collapsed (CSS hides them), so the agent's confirm
   and dismiss state and the chat draft survive. */

export const SECTION_IDS = { agent: "cx-sec-agent", people: "cx-sec-people", chat: "cx-sec-chat" } as const;

export function RoomPanel({
  open,
  onOpen,
  attention,
  conflict,
  peopleCount,
  chatCount,
  agent,
  people,
  chat,
}: {
  open: boolean;
  onOpen: () => void;
  attention: number;
  conflict: boolean;
  peopleCount: number;
  chatCount?: number;
  agent: ReactNode;
  people: ReactNode;
  chat: ReactNode;
}) {
  const openAt = (id: string) => {
    onOpen();
    // After the panel has expanded, bring the section into view.
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 60);
  };

  return (
    <aside className="side" aria-label="Meeting panel">
      {open ? null : (
        <div className="side-mini" role="toolbar" aria-label="Collapsed panel">
          {conflict ? (
            <button
              type="button"
              className="mini-btn is-alert tap"
              data-tip="Conflict needs you"
              aria-label="Expand panel: conflict needs you"
              onClick={() => openAt(SECTION_IDS.agent)}
            >
              <Warning size={17} weight="bold" aria-hidden />
              <span className="mini-badge is-alert" aria-hidden>
                !
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="mini-btn tap"
            data-tip="My agent"
            aria-label={`Expand panel: my agent${attention ? `, ${attention} need you` : ""}`}
            onClick={() => openAt(SECTION_IDS.agent)}
          >
            <Sparkle size={17} aria-hidden />
            {attention > 0 ? (
              <span className="mini-badge" aria-hidden>
                {attention}
              </span>
            ) : null}
          </button>
          <span className="mini-sep" aria-hidden="true"></span>
          <button
            type="button"
            className="mini-btn tap"
            data-tip="Participants"
            aria-label={`Expand panel: ${peopleCount} participants`}
            onClick={() => openAt(SECTION_IDS.people)}
          >
            <Users size={16} aria-hidden />
            <span className="mini-badge" aria-hidden>
              {peopleCount}
            </span>
          </button>
          <button
            type="button"
            className="mini-btn tap"
            data-tip="Live chat"
            aria-label="Expand panel: live chat"
            onClick={() => openAt(SECTION_IDS.chat)}
          >
            <ChatCircle size={16} aria-hidden />
            {chatCount ? (
              <span className="mini-badge" aria-hidden>
                {chatCount}
              </span>
            ) : null}
          </button>
        </div>
      )}

      <div className="side-inner" hidden={!open}>
        {agent}
        {people}
        {chat}
      </div>
    </aside>
  );
}
