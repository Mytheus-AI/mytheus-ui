"use client";

import { useId, useState } from "react";

/* A description that may be long: three lines, then "More" (and "Less"). Short text shows whole
   with no control. The button names what it expands for a screen reader. */
export function DescriptionText({ text, label, className = "", limit = 220 }: { text: string; label: string; className?: string; limit?: number }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const long = text.length > limit;
  return (
    <div>
      <p id={id} className={`whitespace-pre-line ${long && !open ? "line-clamp-3" : ""} ${className}`}>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="mt-1 min-h-[40px] rounded-ctl text-[14px] font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink-3"
        >
          {open ? "Less" : "More"}
          <span className="sr-only"> about {label}</span>
        </button>
      ) : null}
    </div>
  );
}
