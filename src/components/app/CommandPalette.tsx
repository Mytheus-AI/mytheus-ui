"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowBendDownLeft,
  CheckSquare,
  ClockCounterClockwise,
  MagnifyingGlass,
  Moon,
  Plus,
  Scales,
  Smiley,
  Sparkle,
  ArrowsLeftRight,
  Broadcast,
  User,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import { NEW_MEETING_HREF, NEW_TASK_HREF, allNavItems } from "@/components/app/nav";
import { useOrgContext } from "@/lib/org-context";
import { paletteIndex, type PaletteIndex } from "@/app/actions/palette";
import { GROUP_LABEL, recentEntries, searchPalette, type PaletteEntry } from "@/lib/palette";
import { readRecent, rememberRecent } from "@/lib/recent";
import { toggleTheme } from "@/lib/prefs";

/* Cmd/Ctrl+K. Searches your meetings, people, decisions, recent items and every screen, runs
   actions (new meeting, new task, switch theme, switch workspace, open your agent), or sends free
   text to Ask. Meetings, people and decisions come from the same reads their screens use
   (`paletteIndex`, read once when the palette first opens), so it never shows anything the caller
   cannot already see. Ranking lives in `lib/palette.ts` (tested).

   Combobox pattern: focus stays in the field, Up/Down move the highlighted option
   (`aria-activedescendant`), Enter runs it, Escape closes, and focus goes back to whatever opened
   the palette. Tab stays inside the dialog. */

const ICONS: Record<string, Icon> = {
  clock: ClockCounterClockwise,
  plus: Plus,
  task: CheckSquare,
  moon: Moon,
  swap: ArrowsLeftRight,
  capture: Broadcast,
  agent: Smiley,
  meeting: VideoCamera,
  person: User,
  decision: Scales,
};

const whenFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function when(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : whenFormat.format(d);
}

type Shown = { key: string; label: string; entries: (PaletteEntry & { node: ReactNode })[] };

export function CommandPalette({ open, onClose, agentName = null }: { open: boolean; onClose: () => void; agentName?: string | null }) {
  const router = useRouter();
  const { user } = useOrgContext();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pIndex, setPIndex] = useState<PaletteIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<PaletteEntry[]>([]);
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
      setRecent(recentEntries(readRecent()));
      input.current?.focus();
      if (!pIndex && !loading) {
        setLoading(true);
        paletteIndex()
          .then(setPIndex)
          .catch(() => setPIndex({ meetings: null, people: null, decisions: null }))
          .finally(() => setLoading(false));
      }
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [open, pIndex, loading]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const out: PaletteEntry[] = [...recent];
    out.push(
      { key: "a:meeting", group: "actions", label: "Start a new meeting", href: NEW_MEETING_HREF, icon: "plus", keywords: "create schedule call" },
      { key: "a:capture", group: "actions", label: "Capture a call", href: "/capture", icon: "capture", keywords: "zoom meet teams record companion extension" },
      { key: "a:task", group: "actions", label: "New task", href: NEW_TASK_HREF, icon: "task", keywords: "create add to do action" },
      { key: "a:theme", group: "actions", label: "Switch light or dark theme", action: "theme", icon: "moon", keywords: "dark mode appearance toggle" },
      { key: "a:workspace", group: "actions", label: "Switch workspace", href: "/onboarding/organization?switch=1", icon: "swap", keywords: "organization change invitation" },
      { key: "a:agent", group: "actions", label: agentName ? `Open ${agentName}` : "Open your agent", href: "/agent", icon: "agent", keywords: "your agent profile" },
    );
    for (const i of allNavItems(user.role === "admin"))
      out.push({ key: `p:${i.href}`, group: "pages", label: i.label, href: i.href, keywords: i.keywords, icon: `nav:${i.href}` });
    for (const m of pIndex?.meetings ?? [])
      out.push({ key: `m:${m.id}`, group: "meetings", label: m.title, hint: when(m.start), href: `/meetings/${m.id}`, at: m.start ?? undefined, icon: "meeting" });
    for (const p of pIndex?.people ?? [])
      out.push({ key: `u:${p.id}`, group: "people", label: p.isYou ? `${p.name} (you)` : p.name, hint: p.email, href: `/people/${p.id}`, icon: "person" });
    for (const d of pIndex?.decisions ?? [])
      out.push({
        key: `d:${d.id}`,
        group: "decisions",
        label: d.content,
        hint: d.meetingTitle,
        href: `/meetings/${d.meetingId}/decisions/${d.id}`,
        at: d.at,
        icon: "decision",
      });
    return out;
  }, [recent, pIndex, user.role, agentName]);

  const navIcons = useMemo(() => new Map(allNavItems(true).map((i) => [`nav:${i.href}`, i.icon])), []);

  const groups = useMemo<Shown[]>(() => {
    const q = query.trim();
    const iconFor = (e: PaletteEntry) => {
      const I = (e.icon && (ICONS[e.icon] ?? navIcons.get(e.icon))) || MagnifyingGlass;
      return <I size={19} />;
    };
    const ranked = searchPalette(q, entries).map((g) => ({
      key: g.group,
      label: GROUP_LABEL[g.group],
      entries: g.entries.map((e) => ({ ...e, node: iconFor(e) })),
    }));
    const ask: Shown[] = q
      ? [
          {
            key: "ask",
            label: "Ask",
            entries: [
              {
                key: "ask",
                group: "actions",
                label: `Ask Mytheus: ${q}`,
                hint: "enter",
                href: `/search?q=${encodeURIComponent(q)}`,
                node: <Sparkle size={19} weight="fill" />,
              },
            ],
          },
        ]
      : [];
    return [...ask, ...ranked];
  }, [query, entries, navIcons]);

  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);

  useEffect(() => {
    if (open) document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
    // optId is derived from a stable id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  if (!open) return null;

  const run = (e: PaletteEntry) => {
    onClose();
    if (e.action === "theme") {
      toggleTheme();
      return;
    }
    if (!e.href) return;
    if (e.group === "meetings" || e.group === "people" || e.group === "decisions" || e.group === "recent")
      rememberRecent({ label: e.label, href: e.href, hint: e.hint, icon: e.icon });
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
            placeholder="Search meetings, people and decisions, or ask"
            autoComplete="off"
            data-ring="none"
            spellCheck={false}
            className="h-[60px] w-full min-w-0 bg-transparent text-[17px] text-ink !outline-none placeholder:text-ink-3"
          />
          <kbd
            aria-hidden
            className="hidden shrink-0 rounded-full border border-line-2 bg-surface-2 px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink-3 sm:inline"
          >
            Esc
          </kbd>
        </div>

        <div id={listId} role="listbox" aria-label="Results" className="max-h-[min(52vh,440px)] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="display text-[22px] text-ink-display">No matches</p>
              <p className="mt-1.5 text-[14px] text-ink-3">Try a meeting, a person, a decision, or a screen like Inbox.</p>
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
                      className={`flex h-11 cursor-pointer items-center gap-3 rounded-ctl px-3.5 text-[14px] font-medium transition-colors duration-100 ${
                        on ? "bg-bg-2 text-ink" : "text-ink-2"
                      }`}
                    >
                      <span aria-hidden className={on ? "text-signal" : "text-ink-3"}>
                        {e.node}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{e.label}</span>
                      {e.hint === "enter" ? (
                        <ArrowBendDownLeft size={16} aria-hidden className="shrink-0 text-ink-3" />
                      ) : e.hint ? (
                        <span className="hidden max-w-[40%] shrink-0 truncate text-[12.5px] text-ink-3 sm:inline">{e.hint}</span>
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
          <span className="ml-auto">{loading ? "Loading meetings, people and decisions" : "Answers come from meetings you were in"}</span>
        </div>
      </div>
    </div>
  );
}
