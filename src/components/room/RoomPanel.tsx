"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  CaretDown,
  ChatCircleText,
  Sparkle,
  SidebarSimple,
  Users,
  Warning,
} from "@phosphor-icons/react";

/* The right-hand panel: Agent / Chat / People.

   Desktop (960px and up): a 392px card that collapses to a 68px icon rail. The rail keeps the
   counts visible and turns red-tinted while a conflict is open.
   Under 960px: a bottom sheet pinned above the control bar with three snap heights (peek, half,
   full). Drag the handle or the header, tap it, or press Enter on it to move between them.

   All three tab panels stay mounted and are only hidden, so the agent's confirm / dismiss state
   and the chat draft survive a tab switch. */

export type PanelTab = "agent" | "chat" | "people";
export type SheetSize = "peek" | "half" | "full";

const TABS: { key: PanelTab; label: string; Icon: typeof Sparkle }[] = [
  { key: "agent", label: "Agent", Icon: Sparkle },
  { key: "chat", label: "Chat", Icon: ChatCircleText },
  { key: "people", label: "People", Icon: Users },
];

const SHEET_HEIGHT: Record<SheetSize, string> = {
  // The sheet is a dock: it runs to the bottom of the screen and its last 88px is the footer zone the
  // control bar floats in, so each height is the old visible height plus that footer.
  peek: "max-[959px]:h-[162px]",
  half: "max-[959px]:h-[calc(54%+88px)]",
  full: "max-[959px]:h-[calc(100%-12px)]",
};

const HOT = "bg-signal-soft text-signal-deep";

export function RoomPanel({
  tab,
  onTab,
  desktopOpen,
  onDesktopOpen,
  sheet,
  onSheet,
  narrow,
  attention,
  conflict,
  peopleCount,
  agent,
  chat,
  people,
}: {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  desktopOpen: boolean;
  onDesktopOpen: (open: boolean) => void;
  sheet: SheetSize;
  onSheet: (s: SheetSize) => void;
  narrow: boolean;
  attention: number;
  conflict: boolean;
  peopleCount: number;
  agent: ReactNode;
  chat: ReactNode;
  people: ReactNode;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const drag = useRef({ active: false, y0: 0, h0: 0, moved: 0, t0: 0 });
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const sizes = () => {
    const parent = panelRef.current?.offsetParent as HTMLElement | null;
    const H = parent?.clientHeight ?? window.innerHeight;
    return { peek: 162, half: Math.round(H * 0.54) + 88, full: H - 12 };
  };

  const onDown = (e: PointerEvent<HTMLElement>) => {
    if (!narrow || e.target !== e.currentTarget) return;
    drag.current = {
      active: true,
      y0: e.clientY,
      h0: panelRef.current?.offsetHeight ?? 0,
      moved: 0,
      t0: Date.now(),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const s = sizes();
    d.moved = Math.max(d.moved, Math.abs(d.y0 - e.clientY));
    if (d.moved >= 5) setDragHeight(Math.min(s.full, Math.max(s.peek, d.h0 + (d.y0 - e.clientY))));
  };
  const onUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    setDragHeight(null);
    if (d.moved < 5) {
      onSheet(sheet === "peek" ? "half" : "peek");
      return;
    }
    // Project the release velocity a little so a flick lands on the next snap point.
    const s = sizes();
    const v = (d.y0 - e.clientY) / Math.max(1, Date.now() - d.t0);
    const target = d.h0 + (d.y0 - e.clientY) + v * 120;
    let best: SheetSize = "peek";
    let bestDist = Infinity;
    (["peek", "half", "full"] as const).forEach((k) => {
      const dist = Math.abs(s[k] - target);
      if (dist < bestDist) {
        bestDist = dist;
        best = k;
      }
    });
    onSheet(best);
  };
  const dragProps = {
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: onUp,
    onPointerCancel: onUp,
  };

  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.key === tab) + (e.key === "ArrowRight" ? 1 : -1);
    const next = TABS[(i + TABS.length) % TABS.length].key;
    onTab(next);
    document.getElementById(`room-tab-${next}`)?.focus();
  };

  const counts: Record<PanelTab, { n: number; hot: boolean }> = {
    agent: { n: attention, hot: true },
    chat: { n: 0, hot: true },
    people: { n: peopleCount, hot: false },
  };

  return (
    <aside
      ref={panelRef}
      aria-label="Meeting side panel"
      data-sheet={sheet}
      style={dragHeight != null ? { height: dragHeight } : undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape" && narrow && sheet !== "peek") onSheet("peek");
      }}
      className={`relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-[0_1px_2px_rgba(40,30,20,0.06)] max-[959px]:absolute max-[959px]:inset-x-0 max-[959px]:bottom-0 max-[959px]:z-20 max-[959px]:rounded-b-none max-[959px]:rounded-t-[28px] max-[959px]:border-x-0 max-[959px]:border-b-0 max-[959px]:shadow-[0_-10px_30px_-12px_rgba(40,30,20,0.3)] ${
        dragHeight != null
          ? ""
          : "max-[959px]:transition-[height] max-[959px]:duration-300 motion-reduce:transition-none"
      } ${SHEET_HEIGHT[sheet]}`}
    >
      {/* ---- collapsed rail (desktop only) ---- */}
      {!desktopOpen ? (
        <div
          role="toolbar"
          aria-label="Collapsed panel"
          className="hidden h-full flex-col items-center gap-2 py-3 min-[960px]:flex"
        >
          <RailButton label="Expand panel" onClick={() => onDesktopOpen(true)}>
            <SidebarSimple size={21} aria-hidden />
          </RailButton>
          <span aria-hidden className="my-0.5 h-px w-6 bg-line" />
          <RailButton
            label={attention > 0 ? `Agent, ${attention} need you` : "Agent"}
            alert={conflict}
            onClick={() => {
              onDesktopOpen(true);
              onTab("agent");
            }}
            badge={attention}
          >
            {conflict ? (
              <Warning size={21} weight="fill" aria-hidden />
            ) : (
              <Sparkle size={21} aria-hidden />
            )}
          </RailButton>
          <RailButton
            label="Chat"
            onClick={() => {
              onDesktopOpen(true);
              onTab("chat");
            }}
          >
            <ChatCircleText size={21} aria-hidden />
          </RailButton>
          <RailButton
            label={`People, ${peopleCount} in the call`}
            onClick={() => {
              onDesktopOpen(true);
              onTab("people");
            }}
            badge={peopleCount}
            quietBadge
          >
            <Users size={21} aria-hidden />
          </RailButton>
        </div>
      ) : null}

      {/* ---- the pane ---- */}
      <div
        className={`min-h-0 flex-1 flex-col ${desktopOpen ? "flex" : "hidden max-[959px]:flex"}`}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag to resize the panel, or press Enter to open or close it"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSheet(sheet === "peek" ? "half" : "peek");
            }
          }}
          {...dragProps}
          className="relative hidden h-[22px] shrink-0 cursor-grab touch-none after:absolute after:left-1/2 after:top-[9px] after:h-[5px] after:w-10 after:-translate-x-1/2 after:rounded-[3px] after:bg-line-2 max-[959px]:block data-[peek=true]:after:bg-ink-3"
          data-peek={sheet === "peek"}
        />

        <div
          {...dragProps}
          className={`flex shrink-0 touch-none items-center gap-2 border-b px-3 pb-2.5 pt-3 min-[960px]:touch-auto max-[959px]:pt-0 ${
            narrow && sheet === "peek" ? "border-transparent" : "border-line"
          }`}
        >
          <div
            role="tablist"
            aria-label="Panel sections"
            onKeyDown={onTabsKey}
            className="flex min-w-0 flex-1 gap-0.5 rounded-pill bg-bg-2 p-[3px]"
          >
            {TABS.map(({ key, label, Icon }) => {
              const selected = tab === key;
              const c = counts[key];
              return (
                <button
                  key={key}
                  id={`room-tab-${key}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`room-tabpanel-${key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onTab(key)}
                  className={`inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[11px] px-1.5 text-[13px] focus-visible:!rounded-[11px] font-semibold transition-colors duration-150 active:scale-[0.97] motion-reduce:transition-none min-[960px]:px-2 ${
                    selected
                      ? "bg-pill text-white"
                      : "text-ink-3 hover:bg-surface hover:text-ink"
                  }`}
                >
                  <Icon size={16} weight={selected ? "fill" : "regular"} aria-hidden />
                  <span className="truncate">{label}</span>
                  {c.n > 0 ? (
                    <span
                      className={`grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-bold leading-none ${
                        c.hot ? HOT : "bg-bg-3 text-ink-2"
                      }`}
                    >
                      {c.n}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => (narrow ? onSheet("peek") : onDesktopOpen(false))}
            aria-label={narrow ? "Collapse sheet" : "Collapse panel"}
            title={narrow ? "Collapse sheet" : "Collapse panel"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-pill text-ink-3 transition-colors duration-150 hover:bg-bg-2 hover:text-ink focus-visible:!rounded-pill active:scale-95 motion-reduce:transition-none"
          >
            <SidebarSimple size={20} className="-scale-x-100 max-[959px]:hidden" aria-hidden />
            <CaretDown size={18} className="hidden max-[959px]:block" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 max-[959px]:pb-[88px]">
          {(
            [
              ["agent", agent],
              ["chat", chat],
              ["people", people],
            ] as const
          ).map(([key, node]) => (
            <div
              key={key}
              id={`room-tabpanel-${key}`}
              role="tabpanel"
              aria-labelledby={`room-tab-${key}`}
              hidden={tab !== key}
              className="h-full min-h-0"
            >
              {node}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function RailButton({
  label,
  onClick,
  children,
  badge = 0,
  alert = false,
  quietBadge = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
  alert?: boolean;
  quietBadge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative grid h-11 w-11 place-items-center rounded-pill transition-[background-color,color,transform] duration-150 focus-visible:!rounded-pill active:scale-95 motion-reduce:transition-none ${
        alert
          ? "bg-priority-high-soft text-priority-high"
          : "text-ink-3 hover:bg-bg-2 hover:text-ink"
      }`}
    >
      {children}
      {badge > 0 ? (
        <span
          aria-hidden
          className={`absolute right-0 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-surface px-1 text-[11px] font-bold leading-none ${
            alert
              ? "bg-priority-high text-surface"
              : quietBadge
                ? "bg-bg-3 text-ink-2"
                : HOT
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
