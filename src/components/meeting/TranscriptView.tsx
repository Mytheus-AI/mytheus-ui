"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TranscriptChunk } from "@/lib/mock/data";

/* The transcript reader: colored speaker labels (a stable color per speaker,
   in order of first appearance), in-page search with match highlighting, and
   click-to-jump timestamps. Client island — the page around it stays RSC. */

const SPEAKER_COLORS = [
  "text-signal-deep",
  "text-priority-low",
  "text-priority-medium",
  "text-priority-high",
] as const;

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-signal-soft px-0.5 text-signal-deep">
        {text.slice(i, i + query.length)}
      </mark>
      {highlight(text.slice(i + query.length), query)}
    </>
  );
}

export function TranscriptView({ chunks }: { chunks: TranscriptChunk[] }) {
  const [query, setQuery] = useState("");

  const speakerColor = useMemo(() => {
    const map = new Map<string, string>();
    chunks.forEach((c) => {
      if (!map.has(c.speaker)) {
        map.set(c.speaker, SPEAKER_COLORS[map.size % SPEAKER_COLORS.length]);
      }
    });
    return map;
  }, [chunks]);

  const q = query.trim();
  const visible = q
    ? chunks.filter(
        (c) =>
          c.text.toLowerCase().includes(q.toLowerCase()) ||
          c.speaker.toLowerCase().includes(q.toLowerCase()),
      )
    : chunks;

  return (
    <div>
      {/* search + speakers legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full max-w-[340px]">
          <span className="sr-only">Search the transcript</span>
          <svg
            viewBox="0 0 16 16"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
            fill="none"
            aria-hidden
          >
            <circle cx="7" cy="7" r="4.4" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.4 10.4 3.1 3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the transcript"
            className="w-full rounded-pill border border-line bg-white py-2.5 pl-10 pr-4 text-[13.5px] text-ink outline-none placeholder:text-ink-3 focus-visible:border-signal"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {Array.from(speakerColor.entries()).map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5">
              <Avatar name={name} size="sm" className="h-5 w-5 text-[9px]" />
              <span className={`font-mono text-[10.5px] uppercase tracking-wider ${color}`}>
                {name.split(" ")[0]}
              </span>
            </span>
          ))}
        </div>
      </div>

      {q && (
        <p className="mt-3 text-[12.5px] text-ink-3" role="status">
          {visible.length} matching line{visible.length === 1 ? "" : "s"}
        </p>
      )}

      {/* the transcript */}
      {visible.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No matches"
          description={`Nothing in this transcript matches “${q}”.`}
        />
      ) : (
        <ol className="mt-6 space-y-5 border-l border-line pl-5">
          {visible.map((c) => (
            <li key={c.id} id={c.id} className="scroll-mt-24 target:rounded-lg target:bg-signal-soft/40">
              <div className="flex items-baseline gap-3">
                <a
                  href={`#${c.id}`}
                  className="font-mono text-[10.5px] tabular-nums text-ink-3 transition-colors hover:text-signal-deep"
                  title="Jump to this moment"
                >
                  {c.at}
                </a>
                <span
                  className={`font-mono text-[10.5px] uppercase tracking-wider ${
                    speakerColor.get(c.speaker) ?? "text-ink-3"
                  }`}
                >
                  {c.speaker}
                </span>
              </div>
              <p className="mt-1 max-w-[72ch] text-[14.5px] leading-relaxed text-ink">
                {highlight(c.text, q)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
