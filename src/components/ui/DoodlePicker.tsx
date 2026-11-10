"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { randomDoodleSeed } from "@/lib/doodle";
import { Doodle } from "./Doodle";

/* Choose a face. One big preview, a strip of options, and a shuffle that deals a fresh strip.
   The strip is a radio group (arrow keys move and select, one tab stop), and the preview is
   the selected option, so there is never a mismatch between what you see and what saves. */

function deal(count: number, keep?: string): string[] {
  const fresh = Array.from({ length: count }, () => randomDoodleSeed());
  return keep ? [keep, ...fresh.slice(1)] : fresh;
}

export function DoodlePicker({
  value,
  onChange,
  label = "Choose your doodle",
  size = "md",
}: {
  value: string;
  onChange: (seed: string) => void;
  label?: string;
  /** "sm" fits the sign-up form; "md" fits settings */
  size?: "sm" | "md";
}) {
  // Dealt on the client only: random seeds in the server render would never match the browser's.
  const [options, setOptions] = useState<string[]>([]);
  const [spin, setSpin] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const count = size === "md" ? 7 : 6;

  useEffect(() => {
    setOptions(deal(count, value));
    // Only on mount: later `value` changes come from this strip, which already holds them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shuffle = useCallback(() => {
    const next = deal(count);
    setOptions(next);
    setSpin((s) => s + 1);
    onChange(next[0]);
  }, [onChange, count]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.indexOf(value);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next]);
    refs.current[next]?.focus();
  };

  const big = size === "md" ? "h-24 w-24" : "h-[72px] w-[72px]";
  const small = size === "md" ? "h-11 w-11" : "h-9 w-9";

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <div className="relative shrink-0">
        <span
          key={value}
          className={`doodle-pop block overflow-hidden rounded-full shadow-[0_14px_30px_-18px_rgba(40,30,20,0.55)] ring-[3px] ring-surface ${big}`}
        >
          <Doodle seed={value} className="block h-full w-full" title="Your doodle" />
        </span>
        <button
          type="button"
          onClick={shuffle}
          aria-label="Deal new doodles"
          title="Deal new doodles"
          className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-2 shadow-sm transition-[color,transform,border-color] duration-200 hover:border-line-2 hover:text-ink active:scale-90"
        >
          <svg
            key={spin}
            viewBox="0 0 24 24"
            fill="none"
            className="doodle-dice h-[18px] w-[18px]"
            aria-hidden
          >
            <rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="9" cy="9" r="1.3" fill="currentColor" />
            <circle cx="15" cy="15" r="1.3" fill="currentColor" />
            <circle cx="15" cy="9" r="1.3" fill="currentColor" />
            <circle cx="9" cy="15" r="1.3" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <p id="doodle-picker-label" className="mb-2 text-[12.5px] font-medium text-ink-2">
          {label}
        </p>
        <div
          role="radiogroup"
          aria-labelledby="doodle-picker-label"
          onKeyDown={onKey}
          className="flex flex-wrap gap-1.5"
        >
          {options.length === 0
            ? Array.from({ length: count }).map((_, i) => (
                <span key={i} className={`rounded-full bg-bg-2 ${small}`} aria-hidden />
              ))
            : options.map((seed, i) => {
                const on = seed === value;
                return (
                  <button
                    key={seed}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Doodle ${i + 1}`}
                    tabIndex={on || (!options.includes(value) && i === 0) ? 0 : -1}
                    onClick={() => onChange(seed)}
                    style={{ animationDelay: `${i * 35}ms` }}
                    className={`doodle-deal rounded-full p-[2px] transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 focus-visible:!rounded-full ${
                      on ? "shadow-[0_0_0_2px_var(--signal)]" : "shadow-[0_0_0_1px_var(--line)]"
                    }`}
                  >
                    <Doodle seed={seed} className={`block rounded-full ${small}`} />
                  </button>
                );
              })}
        </div>
      </div>
    </div>
  );
}
