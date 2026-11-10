"use client";

import { useRef, type KeyboardEvent } from "react";
import { CheckCircle, Prohibit, TrendUp } from "@phosphor-icons/react";
import { QUICK_PICKS, type QuickPick as Pick } from "@/lib/api/personal-types";

const ICON = { on_track: TrendUp, blocked: Prohibit, done: CheckCircle } as const;

/* Selected tones follow the frozen colour language: blue informs (on track), amber needs
   attention (blocked), green is done. Each always carries its word, so colour is never alone. */
const ON: Record<Pick, string> = {
  on_track: "bg-priority-low-soft text-priority-low",
  blocked: "bg-priority-medium-soft text-priority-medium",
  done: "bg-ok-soft text-ok",
};

/** A radio group of three, with roving focus: arrows move and select, the selected one (or the
 *  first) is the tab stop. Clicking the selected one clears it, since a pick is optional. */
export function QuickPick({
  value,
  onChange,
  disabled,
  label,
}: {
  value: Pick | null;
  onChange: (next: Pick | null) => void;
  disabled?: boolean;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const at = value ? QUICK_PICKS.findIndex((q) => q.key === value) : -1;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const from = Math.max(0, refs.current.findIndex((r) => r === document.activeElement));
    const n = QUICK_PICKS.length;
    const to =
      e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (from + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + n) % n;
    onChange(QUICK_PICKS[to].key);
    refs.current[to]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className="inline-flex shrink-0 gap-1 rounded-ctl border border-line-2 bg-surface-2 p-1"
    >
      {QUICK_PICKS.map((q, i) => {
        const Icon = ICON[q.key];
        const on = value === q.key;
        return (
          <button
            key={q.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (at === -1 && i === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(on ? null : q.key)}
            className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-ctl px-2.5 text-[14px] font-semibold transition-colors duration-150 disabled:opacity-50 ${
              on ? ON[q.key] : "text-ink-2 hover:bg-bg-2 hover:text-ink"
            }`}
          >
            <Icon size={15} weight={on ? "fill" : "regular"} aria-hidden />
            {q.label}
          </button>
        );
      })}
    </div>
  );
}
