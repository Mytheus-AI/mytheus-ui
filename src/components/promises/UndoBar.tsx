"use client";

import { useEffect, useRef } from "react";
import { WarningCircle } from "@phosphor-icons/react";

/* A short-lived bar at the bottom of the screen after a change that can be undone ("Marked done.
   Undo"), or after a refusal ("Could not update. Your promise is back."). Polite live region for
   the first, an alert for the second. It stays while hovered or focused, then leaves after a few
   seconds. Motion is a 180ms rise that `prefers-reduced-motion` turns into an instant appear. */

export type UndoNotice =
  | { kind: "undo"; key: number; text: string; onUndo: () => void }
  | { kind: "error"; key: number; text: string };

export function UndoBar({ notice, onClose }: { notice: UndoNotice | null; onClose: () => void }) {
  const hold = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!notice) return;
    const arm = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (hold.current) arm();
        else onClose();
      }, notice.kind === "error" ? 7000 : 6000);
    };
    arm();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [notice, onClose]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
      aria-live={notice?.kind === "error" ? "assertive" : "polite"}
      role={notice?.kind === "error" ? "alert" : "status"}
    >
      {notice ? (
        <div
          key={notice.key}
          onMouseEnter={() => (hold.current = true)}
          onMouseLeave={() => (hold.current = false)}
          onFocus={() => (hold.current = true)}
          onBlur={() => (hold.current = false)}
          className="mx-pop pointer-events-auto flex min-h-[48px] max-w-[min(560px,100%)] items-center gap-3 rounded-ctl bg-pill py-1.5 pl-4 pr-1.5 text-[14px] font-medium text-pill-on shadow-warm-3"
        >
          {notice.kind === "error" ? <WarningCircle size={18} weight="fill" aria-hidden className="shrink-0" /> : null}
          <span className="min-w-0 flex-1">{notice.text}</span>
          {notice.kind === "undo" ? (
            <button
              type="button"
              onClick={() => {
                notice.onUndo();
                onClose();
              }}
              className="h-10 shrink-0 rounded-ctl px-3.5 text-[14px] font-semibold text-pill-on underline decoration-signal-line decoration-2 underline-offset-4 transition-colors hover:bg-pill-2"
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-10 shrink-0 rounded-ctl px-3.5 text-[14px] font-semibold text-pill-on transition-colors hover:bg-pill-2"
            >
              Close
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
