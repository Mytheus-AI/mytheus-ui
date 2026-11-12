"use client";

import { useEffect, useId, useRef, useState } from "react";

/* A short description held to two lines, with "More" only when the text is actually cut. The
   whole text is always in the DOM, so a screen reader reads all of it; the button only changes
   what is drawn. Without client JavaScript the text stays clamped and the button never appears. */
export function ClampedText({ children, className = "" }: { children: string; className?: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  return (
    <div className={className}>
      <p id={id} ref={ref} className={`text-[14px] leading-relaxed text-ink-3 ${open ? "" : "line-clamp-2"}`}>
        {children}
      </p>
      {cut || open ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="mt-0.5 rounded-full text-[13px] font-semibold text-ink-2 underline decoration-line-2 underline-offset-[3px] hover:text-ink hover:decoration-ink-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}
