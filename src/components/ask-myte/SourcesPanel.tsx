"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Play, X } from "@phosphor-icons/react";
import { sourceHref, sourceKind, sourceKindLabel, sourceLinkLabel, sourceMeta, sourceTitle } from "@/lib/ask-myte/citations";
import type { Source } from "@/lib/ask-myte/types";

/* The sources of one answer (ADR-0047 D5), opened by a citation. Each source says what it is,
   quotes what was said or shows the record, and links to where it lives: a transcript at the
   second it was said, a decision's lineage, My work. A company-brain passage has no page, so it is
   read here in full. The focused source scrolls into view and takes focus, so a keyboard user
   lands on it. */

export function SourcesPanel({
  sources,
  focused,
  onClose,
  headingId,
}: {
  sources: Source[];
  focused: number | null;
  onClose: () => void;
  headingId: string;
}) {
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (focused === null) return;
    const el = list.current?.querySelector<HTMLElement>(`[data-source="${focused}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.focus({ preventScroll: true });
  }, [focused, sources]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <h2 id={headingId} className="display text-[20px] text-ink">
          Sources
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sources"
          className="grid h-10 w-10 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      {sources.length === 0 ? (
        <p className="px-5 text-[14px] text-ink-3">This answer didn&apos;t need any sources.</p>
      ) : (
        <ol ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-5">
          {sources.map((s) => {
            const href = sourceHref(s);
            const link = sourceLinkLabel(s);
            const meta = sourceMeta(s);
            const quote = sourceKind(s) === "transcript";
            const active = focused === s.n;
            return (
              <li
                key={s.n}
                data-source={s.n}
                tabIndex={-1}
                className={`rounded-card border bg-surface p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ${active ? "border-signal-line shadow-warm-1" : "border-line"}`}
              >
                <p className="text-[12.5px] font-semibold text-ink-3">
                  {s.n}, {sourceKindLabel(s)}
                </p>
                <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">{sourceTitle(s)}</p>
                {s.text ? (
                  quote ? (
                    <blockquote className="mt-1.5 font-display text-[15.5px] italic leading-snug text-ink-2">&ldquo;{s.text}&rdquo;</blockquote>
                  ) : (
                    <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-snug text-ink-2">{s.text}</p>
                  )
                ) : null}
                {meta ? <p className="mt-2 text-[13px] text-ink-3">{meta}</p> : null}
                {href && link ? (
                  <Link href={href} className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline">
                    {sourceKind(s) === "transcript" ? <Play size={13} weight="fill" aria-hidden /> : null}
                    {link}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
