"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowBendDownLeft, MagnifyingGlass, Plus, Sparkle } from "@phosphor-icons/react";
import { NEW_MEETING_HREF, allNavItems } from "@/components/app/nav";
import { useOrgContext } from "@/lib/org-context";

/* Cmd/Ctrl+K. Jumps to any screen, starts a meeting, or sends free text to Ask. It holds no data
   of its own, so it can never show something the caller is not allowed to see.

   Combobox pattern: focus stays in the field, Up/Down move the highlighted option
   (`aria-activedescendant`), Enter runs it, Escape closes, and focus goes back to whatever opened
   the palette. Tab stays inside the dialog. */

type Entry = { key: string; label: string; hint?: string; href: string; icon: ReactNode };
type Group = { key: string; label: string; entries: Entry[] };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user } = useOrgContext();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const uid = useId();
  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-opt-${i}`;

  useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true;
      const el = document.activeElement;
      opener.current = el instanceof HTMLElement && el !== document.body ? el : null;
      setQuery("");
      setActive(0);
      input.current?.focus();
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [open]);

  const groups = useMemo<Group[]>(() => {
    const q = query.trim();
    const has = (label: string) => !q || label.toLowerCase().includes(q.toLowerCase());
    const ask: Entry[] = q
      ? [{ key: "ask", label: `Ask Mytheus: ${q}`, hint: "enter", href: `/search?q=${encodeURIComponent(q)}`, icon: <Sparkle size={19} weight="fill" /> }]
      : [];
    const actions: Entry[] = [
      { key: "new", label: "Start a new meeting", href: NEW_MEETING_HREF, icon: <Plus size={19} weight="bold" /> },
    ].filter((a) => has(a.label));
    const pages: Entry[] = allNavItems(user.role === "admin")
      .filter((i) => has(i.label))
      .map((i) => ({ key: i.href, label: i.label, hint: "Go to", href: i.href, icon: <i.icon size={19} /> }));
    return [
      { key: "ask", label: "Ask", entries: ask },
      { key: "actions", label: "Actions", entries: actions },
      { key: "pages", label: "Go to", entries: pages },
    ].filter((g) => g.entries.length > 0);
  }, [query, user.role]);

  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);

  useEffect(() => {
    if (open) document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
    // optId is derived from a stable id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  if (!open) return null;

  const run = (e: Entry) => {
    onClose();
    router.push(e.href);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (flat.length ? (a + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Home" && flat.length) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && flat.length) {
      e.preventDefault();
      setActive(flat.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[active];
      if (hit) run(hit);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let index = -1;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-start justify-items-center bg-[rgba(26,22,18,0.45)] px-4 pt-[6vh] backdrop-blur-[3px] sm:pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search or ask"
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            input.current?.focus();
          }
        }}
        className="mx-pop w-full max-w-[640px] overflow-hidden rounded-hero border border-line bg-surface shadow-warm-3"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <MagnifyingGlass size={20} aria-hidden className="shrink-0 text-ink-3" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={flat[active] ? optId(active) : undefined}
            aria-label="Search or ask"
            placeholder="Go to a screen, start a meeting, or ask a question"
            autoComplete="off"
            spellCheck={false}
            className="h-[60px] w-full min-w-0 bg-transparent text-[16px] text-ink !outline-none placeholder:text-ink-3"
          />
          <kbd
            aria-hidden
            className="hidden shrink-0 rounded-full border border-line-2 bg-surface-2 px-2 py-0.5 font-sans text-[12px] font-semibold text-ink-3 sm:inline"
          >
            Esc
          </kbd>
        </div>

        <div id={listId} role="listbox" aria-label="Results" className="max-h-[min(52vh,440px)] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="display text-[19px] text-ink-display">No matches</p>
              <p className="mt-1.5 text-[14px] text-ink-3">Try the name of a screen, like Tasks or Decisions.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} role="group" aria-labelledby={`${uid}-${g.key}`}>
                <div id={`${uid}-${g.key}`} className="px-3.5 pb-1 pt-2.5 text-[12.5px] font-semibold text-ink-3">
                  {g.label}
                </div>
                {g.entries.map((e) => {
                  index += 1;
                  const i = index;
                  const on = i === active;
                  return (
                    <div
                      key={e.key}
                      id={optId(i)}
                      role="option"
                      aria-selected={on}
                      onClick={() => run(e)}
                      onMouseMove={() => {
                        if (!on) setActive(i);
                      }}
                      className={`flex h-11 cursor-pointer items-center gap-3 rounded-ctl px-3.5 text-[14.5px] font-medium transition-colors duration-100 ${
                        on ? "bg-bg-2 text-ink" : "text-ink-2"
                      }`}
                    >
                      <span aria-hidden className={on ? "text-signal" : "text-ink-3"}>
                        {e.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{e.label}</span>
                      {e.hint === "enter" ? (
                        <ArrowBendDownLeft size={16} aria-hidden className="shrink-0 text-ink-3" />
                      ) : e.hint ? (
                        <span className="shrink-0 text-[12.5px] text-ink-3">{e.hint}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          aria-hidden
          className="hidden items-center gap-4 border-t border-line bg-surface-2 px-5 py-2.5 text-[12.5px] text-ink-3 sm:flex"
        >
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded-full border border-line-2 bg-surface px-1.5 font-sans font-semibold">&uarr;</kbd>
            <kbd className="rounded-full border border-line-2 bg-surface px-1.5 font-sans font-semibold">&darr;</kbd>
            to move
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded-full border border-line-2 bg-surface px-1.5 font-sans font-semibold">Enter</kbd>
            to open
          </span>
          <span className="ml-auto">Answers come from meetings you were in</span>
        </div>
      </div>
    </div>
  );
}
