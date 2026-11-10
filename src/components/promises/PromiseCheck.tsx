"use client";

import { Check } from "@phosphor-icons/react";

/** The round done control. A checkbox to assistive tech, 40px to the finger. */
export function PromiseCheck({
  content,
  done,
  busy,
  onToggle,
}: {
  content: string;
  done: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-busy={busy}
      disabled={busy}
      aria-label={done ? `Move back to open: ${content}` : `Mark done: ${content}`}
      onClick={onToggle}
      className="group/check -m-2 grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:cursor-wait"
    >
      <span
        aria-hidden
        className={`grid h-6 w-6 place-items-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-150 motion-safe:group-active/check:scale-90 ${
          done
            ? "border-ok bg-ok text-pill-on"
            : "border-ink-4 bg-surface text-transparent group-hover/check:border-ok group-hover/check:text-ok"
        } ${busy ? "mx-bone" : ""}`}
      >
        <Check size={13} weight="bold" />
      </span>
    </button>
  );
}
