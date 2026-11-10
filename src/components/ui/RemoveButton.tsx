"use client";

import { useEffect, useRef, useState } from "react";
import { Trash } from "@phosphor-icons/react";

/** "Remove" turns into "Remove {what}?" with Remove and Keep, so one stray click never deletes.
    Native buttons (the frozen Button does not forward refs), styled like its sm sizes. */
export function RemoveButton({
  what,
  onConfirm,
  disabled,
  compact = false,
}: {
  what: string;
  onConfirm: () => void;
  disabled?: boolean;
  /** icon-only until asked to confirm, for dense rows */
  compact?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [refocus, setRefocus] = useState(false);
  const yes = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (asking) yes.current?.focus();
    else if (refocus) {
      first.current?.focus();
      setRefocus(false);
    }
  }, [asking, refocus]);

  const btn =
    "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-ctl px-3.5 text-[14px] font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";

  if (!asking)
    return (
      <button
        ref={first}
        type="button"
        disabled={disabled}
        onClick={() => setAsking(true)}
        aria-label={compact ? `Remove ${what}` : undefined}
        title={compact ? `Remove ${what}` : undefined}
        className={`${btn} border border-transparent text-ink-3 hover:bg-priority-high-soft hover:text-priority-high ${compact ? "!h-10 !w-10 !px-0" : ""}`}
      >
        <Trash size={16} aria-hidden />
        {compact ? null : "Remove"}
      </button>
    );

  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={`Remove ${what}?`}>
      <button
        ref={yes}
        type="button"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className={`${btn} border border-[color:color-mix(in_srgb,var(--priority-high)_45%,var(--line))] bg-transparent text-priority-high hover:bg-priority-high-soft`}
      >
        Remove
      </button>
      <button
        type="button"
        onClick={() => {
          setAsking(false);
          setRefocus(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setAsking(false);
            setRefocus(true);
          }
        }}
        className={`${btn} border border-transparent text-ink-2 hover:bg-bg-2 hover:text-ink`}
      >
        Keep
      </button>
    </span>
  );
}

