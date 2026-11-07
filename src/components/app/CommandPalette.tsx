"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowBendDownLeft, MagnifyingGlass, Sparkle } from "@phosphor-icons/react";
import { ADMIN_ITEMS, NAV_SECTIONS } from "@/components/app/nav";
import { useOrgContext } from "@/lib/org-context";

/* Cmd/Ctrl+K. Jumps to any screen, or sends free text to search, which is also where "ask" lives.
   It holds no data of its own, so it can never show something the caller is not allowed to see. */

type Entry = { key: string; label: string; hint?: string; run: () => void; icon: React.ReactNode };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user } = useOrgContext();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    input.current?.focus();
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim();
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const pages = [
      ...NAV_SECTIONS.flatMap((s) => s.items),
      ...(user.role === "admin" ? ADMIN_ITEMS : []),
    ]
      .filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()))
      .map<Entry>((i) => ({
        key: i.href,
        label: i.label,
        hint: "Go to",
        run: go(i.href),
        icon: <i.icon size={19} />,
      }));
    const ask: Entry[] = q
      ? [
          {
            key: "ask",
            label: `Search or ask: ${q}`,
            hint: "Enter",
            run: go(`/search?q=${encodeURIComponent(q)}`),
            icon: <Sparkle size={19} />,
          },
        ]
      : [];
    return [...ask, ...pages];
  }, [query, router, onClose, user.role]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      entries[active]?.run();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-start justify-items-center bg-[rgba(26,22,18,0.45)] px-4 pt-[12vh] backdrop-blur-[3px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search or ask"
        className="w-full max-w-[640px] overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_18px_40px_-8px_rgba(60,45,35,0.35)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <MagnifyingGlass size={20} className="shrink-0 text-ink-3" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Go to a screen, or search and ask"
            aria-label="Search or ask"
            className="h-[60px] w-full bg-transparent text-[16px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
          {entries.length === 0 && (
            <li className="px-4 py-10 text-center text-[14px] text-ink-3">No matching screens.</li>
          )}
          {entries.map((e, i) => (
            <li key={e.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={e.run}
                onMouseEnter={() => setActive(i)}
                className={`flex h-[46px] w-full items-center gap-3 rounded-pill px-3.5 text-left text-[14.5px] font-medium ${
                  i === active ? "bg-bg-2 text-ink" : "text-ink-2"
                }`}
              >
                <span className="text-ink-3">{e.icon}</span>
                <span className="flex-1 truncate">{e.label}</span>
                {e.hint === "Enter" ? (
                  <ArrowBendDownLeft size={16} className="text-ink-3" />
                ) : (
                  <span className="text-[12px] text-ink-3">{e.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
