"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Headphones } from "@phosphor-icons/react";
import { listeningLabel } from "@/lib/listening";

/* "3 agents listening" in the room's top bar (In every meeting at once). Everyone in the room
   sees how many people's Mytes are listening for them, so nobody is listened to without knowing;
   the button opens whose. A change is announced politely to screen readers. Nothing shows when no
   agent listens. */

export function ListeningChip({ count, names }: { count: number; names: string[] }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [said, setSaid] = useState("");
  const first = useRef(true);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaid(count > 0 ? `${listeningLabel(count)} in this meeting` : "No Mytes are listening now");
  }, [count]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrap} className="relative inline-flex shrink-0">
      <span className="sr-only" role="status" aria-live="polite">
        {said}
      </span>
      {count > 0 ? (
        <>
          <button
            type="button"
            className="cx-incall cx-listening tap"
            aria-expanded={open}
            aria-controls={`${uid}-who`}
            onClick={() => setOpen((v) => !v)}
            title={listeningLabel(count)}
          >
            <Headphones size={14} weight="bold" aria-hidden />
            <span className="cx-incall-n">{count}</span>
            <span className="cx-incall-label">{count === 1 ? "Myte listening" : "Mytes listening"}</span>
            <span className="sr-only">, show whose</span>
          </button>
          {open ? (
            <div
              id={`${uid}-who`}
              className="absolute left-0 top-[calc(100%+6px)] z-30 w-[min(300px,80vw)] rounded-card border border-line bg-surface p-3.5 text-left shadow-warm-3"
            >
              <p className="text-[13px] font-semibold text-ink">Listening for someone who is not here</p>
              <ul className="mt-2 space-y-1 text-[14px] text-ink-2">
                {names.length ? names.map((n, i) => <li key={`${n}-${i}`}>{n}&rsquo;s Myte</li>) : <li>{listeningLabel(count)}</li>}
              </ul>
              <p className="mt-2.5 text-[12.5px] leading-snug text-ink-3">
                Each Myte only takes notes for its person and pulls them in when something needs them. It never listens off the record.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </span>
  );
}
