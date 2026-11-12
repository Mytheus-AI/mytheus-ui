"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Shuffle } from "@phosphor-icons/react";
import { randomDoodleSeed } from "@/lib/doodle";
import { AgentOrb } from "./AgentOrb";

/* Choose your agent's face: a large live preview of the selected character, a strip of plush
   candidates, and Shuffle, which deals a fresh strip and picks its first. Every option is just a
   seed (`agent_avatar_seed`), so saving goes through the existing action unchanged. The strip is
   a radio group (arrow keys move and select, one tab stop) and the preview is the selected
   option, so what you see is what saves. The preview is alive: it watches the pointer, winks when
   clicked and, given `followInput`, watches what you type. People pick theirs in DoodlePicker. */

function deal(count: number, keep?: string): string[] {
  const fresh = Array.from({ length: count }, () => randomDoodleSeed());
  return keep ? [keep, ...fresh.slice(1)] : fresh;
}

export function OrbPicker({
  value,
  onChange,
  label = "Its face",
  size = "md",
  followInput,
}: {
  value: string;
  onChange: (seed: string) => void;
  label?: string;
  /** "sm" fits the onboarding form; "md" fits settings */
  size?: "sm" | "md";
  /** a selector for the form's text fields: the preview's eyes follow the caret while you type */
  followInput?: string;
}) {
  // Dealt on the client only: random seeds in the server render would never match the browser's.
  const [options, setOptions] = useState<string[]>([]);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = useId();
  const count = size === "md" ? 7 : 6;

  useEffect(() => {
    setOptions(deal(count, value));
    // Only on mount: later `value` changes come from this strip, which already holds them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Use its original face" (or a save that restores) can set a seed the strip does not hold.
  useEffect(() => {
    setOptions((o) => (o.length && !o.includes(value) ? [value, ...o.slice(0, -1)] : o));
  }, [value]);

  const shuffle = useCallback(() => {
    const next = deal(count);
    setOptions(next);
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

  const bigPx = size === "md" ? 128 : 96;
  const smallPx = size === "md" ? 44 : 36;

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <span
        className="block shrink-0 overflow-hidden rounded-full bg-surface shadow-[0_14px_30px_-18px_rgba(40,30,20,0.55)] ring-[3px] ring-surface"
        style={{ width: bigPx, height: bigPx }}
      >
        <AgentOrb seed={value} mode="live" size={bigPx} label="Your agent's face" followInput={followInput} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p id={labelId} className="text-[12.5px] font-medium text-ink-2">
            {label}
          </p>
          <button
            type="button"
            onClick={shuffle}
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink-2 transition-[color,border-color,transform] duration-150 hover:border-line-2 hover:text-ink motion-safe:active:scale-95"
          >
            <Shuffle size={15} aria-hidden />
            Shuffle
          </button>
        </div>
        <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKey} className="flex flex-wrap gap-1.5">
          {options.length === 0
            ? Array.from({ length: count }).map((_, i) => (
                <span key={i} className="rounded-full bg-bg-2" style={{ width: smallPx + 4, height: smallPx + 4 }} aria-hidden />
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
                    aria-label={`Face ${i + 1}`}
                    tabIndex={on || (!options.includes(value) && i === 0) ? 0 : -1}
                    onClick={() => onChange(seed)}
                    style={{ animationDelay: `${i * 35}ms` }}
                    className={`doodle-deal rounded-full p-[2px] transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 focus-visible:!rounded-full ${
                      on ? "shadow-[0_0_0_2px_var(--signal)]" : "shadow-[0_0_0_1px_var(--line)]"
                    }`}
                  >
                    <span className="block overflow-hidden rounded-full bg-surface" style={{ width: smallPx, height: smallPx }}>
                      <AgentOrb seed={seed} size={smallPx} />
                    </span>
                  </button>
                );
              })}
        </div>
      </div>
    </div>
  );
}
