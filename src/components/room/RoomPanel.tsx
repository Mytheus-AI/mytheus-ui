"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChatCircleText, SidebarSimple, Sparkle, Users, Warning } from "@phosphor-icons/react";
import { isTypingTarget, keyTargetOf } from "@/lib/realtime/shortcuts";

/* The room's side panel: Agent, Chat and People as tabs over one scrolling body, as in the room
   design. Collapsed, it becomes a rail of icons that keeps the counts and the conflict visible;
   each icon reopens the panel on its tab. Under 960px the same panel sits under the stage as a
   sheet, and the rail becomes a row.

   Every tab stays mounted while another is showing (and while the panel is collapsed); inactive
   ones are only `hidden`. So the agent's confirm and dismiss state, a candidate being edited and
   the chat draft all survive switching. A conflict pre-empts: when one arrives the panel moves to
   the Agent tab, once, so it cannot sit unseen behind Chat - unless you are typing (a chat message,
   a card edit), when the tab is never pulled from under you; the Agent tab turns red instead and
   the conflict waits there (polish program, Phase 0). Tabs follow the ARIA pattern: arrow keys,
   Home and End move between them. The Chat tab counts messages you have not seen. */

export const SECTION_IDS = { agent: "cx-sec-agent", people: "cx-sec-people", chat: "cx-sec-chat" } as const;

export type PanelTab = "agent" | "chat" | "people";
type Tab = PanelTab;
const ORDER: Tab[] = ["agent", "chat", "people"];

export function RoomPanel({
  open,
  onOpen,
  onClose,
  attention,
  conflict,
  peopleCount,
  chatCount,
  agent,
  people,
  chat,
  onTab,
}: {
  open: boolean;
  onOpen: () => void;
  /** Collapses the panel to its rail. */
  onClose?: () => void;
  attention: number;
  conflict: boolean;
  peopleCount: number;
  chatCount?: number;
  agent: ReactNode;
  people: ReactNode;
  chat: ReactNode;
  /** Which tab is on screen (null while the panel is collapsed), e.g. to mark chat as seen. */
  onTab?: (tab: Tab | null) => void;
}) {
  const [tab, setTab] = useState<Tab>("agent");
  useEffect(() => {
    onTab?.(open ? tab : null);
  }, [open, tab, onTab]);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ agent: null, chat: null, people: null });

  const wasConflict = useRef(false);
  useEffect(() => {
    if (conflict && !wasConflict.current) {
      const typing = typeof document !== "undefined" && isTypingTarget(keyTargetOf(document.activeElement));
      if (!typing) setTab("agent");
    }
    wasConflict.current = conflict;
  }, [conflict]);

  const openAt = (t: Tab) => {
    setTab(t);
    onOpen();
    // After the panel has expanded, put focus on the tab that was asked for.
    window.setTimeout(() => tabRefs.current[t]?.focus(), 60);
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ORDER.indexOf(tab);
    let next: Tab | null = null;
    if (e.key === "ArrowRight") next = ORDER[(i + 1) % ORDER.length];
    else if (e.key === "ArrowLeft") next = ORDER[(i + ORDER.length - 1) % ORDER.length];
    else if (e.key === "Home") next = ORDER[0];
    else if (e.key === "End") next = ORDER[ORDER.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const tabs: { id: Tab; label: string; icon: ReactNode; count?: number; hot?: boolean; alert?: boolean }[] = [
    {
      id: "agent",
      label: "Agent",
      icon: conflict ? <Warning size={16} weight="bold" aria-hidden /> : <Sparkle size={16} aria-hidden />,
      count: attention || undefined,
      hot: true,
      alert: conflict,
    },
    { id: "chat", label: "Chat", icon: <ChatCircleText size={16} aria-hidden />, count: chatCount || undefined, hot: true },
    { id: "people", label: "People", icon: <Users size={16} aria-hidden />, count: peopleCount },
  ];

  return (
    <aside className="side" aria-label="Meeting panel">
      {open ? null : (
        <div className="side-mini" role="toolbar" aria-label="Meeting panel" aria-orientation="vertical">
          <button
            type="button"
            className="mini-btn tap tip-left"
            data-tip="Show panel"
            aria-label="Show panel"
            onClick={onOpen}
          >
            <SidebarSimple size={20} mirrored aria-hidden />
          </button>
          <span className="mini-sep" aria-hidden="true"></span>
          <button
            type="button"
            className={`mini-btn tap tip-left${conflict ? " is-alert" : ""}`}
            data-tip={conflict ? "Conflict needs you" : "Agent"}
            aria-label={`Open agent${conflict ? ", a conflict needs you" : attention ? `, ${attention} need you` : ""}`}
            onClick={() => openAt("agent")}
          >
            {conflict ? <Warning size={20} weight="bold" aria-hidden /> : <Sparkle size={20} aria-hidden />}
            {conflict ? (
              <span className="mini-badge is-alert" aria-hidden>
                !
              </span>
            ) : attention > 0 ? (
              <span className="mini-badge" aria-hidden>
                {attention}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="mini-btn tap tip-left"
            data-tip="Chat"
            aria-label={`Open chat${chatCount ? `, ${chatCount} unread` : ""}`}
            onClick={() => openAt("chat")}
          >
            <ChatCircleText size={20} aria-hidden />
            {chatCount ? (
              <span className="mini-badge" aria-hidden>
                {chatCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="mini-btn tap tip-left"
            data-tip="People"
            aria-label={`Open people, ${peopleCount} in the call`}
            onClick={() => openAt("people")}
          >
            <Users size={20} aria-hidden />
            <span className="mini-badge is-quiet" aria-hidden>
              {peopleCount}
            </span>
          </button>
        </div>
      )}

      <div className="side-inner" hidden={!open}>
        <div className="side-head">
          <div className="side-tabs" role="tablist" aria-label="Panel sections" onKeyDown={onTabKey}>
            {tabs.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`cx-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`cx-tp-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className={`side-tab tap${t.alert ? " is-alert" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                <span className="side-tab-label">{t.label}</span>
                {t.count ? (
                  <span className={`mx-count${t.hot ? " is-hot" : ""}`}>
                    {t.count}
                    <span className="sr-only">{t.id === "people" ? " in the call" : t.id === "agent" ? " need you" : " unread"}</span>
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {onClose ? (
            <button
              type="button"
              className="cx-icon-btn sm tap tip-below tip-end"
              data-tip="Hide panel"
              aria-label="Hide panel"
              onClick={onClose}
            >
              <SidebarSimple size={18} aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="side-body">
          <section role="tabpanel" id="cx-tp-agent" aria-labelledby="cx-tab-agent" className="side-tp" hidden={tab !== "agent"}>
            {agent}
          </section>
          <section
            role="tabpanel"
            id="cx-tp-chat"
            aria-labelledby="cx-tab-chat"
            className="side-tp is-chat"
            hidden={tab !== "chat"}
          >
            {chat}
          </section>
          <section role="tabpanel" id="cx-tp-people" aria-labelledby="cx-tab-people" className="side-tp" hidden={tab !== "people"}>
            {people}
          </section>
        </div>
      </div>
    </aside>
  );
}
