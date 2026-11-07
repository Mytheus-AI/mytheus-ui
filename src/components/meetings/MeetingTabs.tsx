"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/* Line tabs for the meeting detail. The panels arrive already rendered by the Server Component
   page and are all kept in the DOM, with only the active one visible, so switching tabs costs no
   fetch and no client rendering of the content. The active tab is mirrored into the URL hash so
   a link can open straight onto Decisions or Actions. */

export interface MeetingTab {
  key: string;
  label: string;
  /** Shown as a small count beside the label when present. */
  count?: number;
}

export function MeetingTabs({
  tabs,
  panels,
  label = "Meeting sections",
}: {
  tabs: MeetingTab[];
  panels: Record<string, ReactNode>;
  label?: string;
}) {
  const [active, setActive] = useState(tabs[0].key);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (tabs.some((t) => t.key === h)) setActive(h);
  }, [tabs]);

  const select = (key: string, focus = false) => {
    setActive(key);
    try {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${key}`);
    } catch {
      // History can be unavailable in embedded views; the tab still switches.
    }
    if (focus) refs.current[key]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.key === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i + tabs.length - 1) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    select(tabs[next].key, true);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="mb-6 flex gap-6 overflow-x-auto border-b border-line"
      >
        {tabs.map((t) => {
          const selected = active === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`md-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`md-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.key)}
              className={`relative inline-flex h-11 shrink-0 items-center gap-2 text-[14px] font-semibold transition-colors duration-150 active:opacity-70 ${
                selected ? "text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={`rounded-full px-1.5 text-[11.5px] ${
                    selected ? "bg-signal-soft text-signal-deep" : "bg-bg-2 text-ink-3"
                  }`}
                >
                  {t.count}
                </span>
              )}
              {selected && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-signal-deep"
                />
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <section
          key={t.key}
          id={`md-panel-${t.key}`}
          role="tabpanel"
          aria-labelledby={`md-tab-${t.key}`}
          hidden={active !== t.key}
        >
          {panels[t.key]}
        </section>
      ))}
    </div>
  );
}
