"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TranscriptChunk, MeetingSpeaker } from "@/lib/api/transcript";

/* The transcript reader. Plan 3-4 §3.8 step 2: ordered finals, virtualized, timestamp jump.
 *
 * VIRTUALIZED, because the plan says "never render un-virtualized" and means it: the capacity
 * model puts a meeting at roughly 360 finals, and an un-virtualized list of that many rows with
 * per-row highlighting re-renders the whole document on every keystroke in the search box.
 *
 * Virtualization and jump-to-timestamp interact, which is why they are solved together here.
 * The previous version jumped with an `href="#chunkId"` anchor, and that cannot work once rows
 * are windowed: the target element does not exist in the DOM until it is scrolled near. Jump is
 * therefore `scrollToIndex` against the virtualizer, and the anchors become buttons.
 *
 * Speaker labels resolve through `meeting_speakers`, never guessed here. `transcript_chunks`
 * carries the raw diarized label ("0", "1") exactly as the provider emitted it, and the
 * `speaker_id` to `user_id` mapping is a separate, user-correctable record - so an unmapped
 * speaker reads as "Speaker 0" rather than this component inventing a name for it.
 */

const SPEAKER_COLORS = [
  "text-signal-deep",
  "text-priority-low",
  "text-priority-medium",
  "text-priority-high",
  "text-ink",
  "text-ink-2",
] as const;

/** Hashed, not first-appearance-ordered: a speaker must keep the same color when the list is
 *  filtered by a search, and an order-based palette reassigns every color as soon as the first
 *  speaker's lines stop matching. Same rule as the live-caption strip, deliberately. */
function speakerColor(speakerId: string): string {
  let hash = 0;
  for (let i = 0; i < speakerId.length; i += 1) hash = (hash * 31 + speakerId.charCodeAt(i)) | 0;
  return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length];
}

function formatOffset(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

export function TranscriptView({
  chunks,
  speakers = [],
  speakerNames = {},
}: {
  chunks: TranscriptChunk[];
  speakers?: MeetingSpeaker[];
  /** `user_id` to display name, resolved by the page. This component never fetches. */
  speakerNames?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const labelFor = useMemo(() => {
    const bySpeaker = new Map(speakers.map((s) => [s.speaker_id, s]));
    return (speakerId: string): string => {
      const mapped = bySpeaker.get(speakerId);
      const name = mapped?.user_id ? speakerNames[mapped.user_id] : undefined;
      return name ?? `Speaker ${speakerId}`;
    };
  }, [speakers, speakerNames]);

  const q = query.trim();
  const visible = useMemo(() => {
    if (!q) return chunks;
    const needle = q.toLowerCase();
    return chunks.filter(
      (c) =>
        c.text.toLowerCase().includes(needle) || labelFor(c.speaker_id).toLowerCase().includes(needle),
    );
  }, [chunks, q, labelFor]);

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    // A turn is usually two or three lines at this measure; `measureElement` below corrects the
    // estimate per row, so this only has to be close enough to size the scrollbar sensibly.
    estimateSize: () => 96,
    overscan: 8,
  });

  const distinctSpeakers = useMemo(
    () => Array.from(new Set(chunks.map((c) => c.speaker_id))),
    [chunks],
  );

  return (
    <div>
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
            <path
              d="m10.4 10.4 3.1 3.1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the transcript"
            className="min-h-[44px] w-full rounded-pill border border-line bg-surface py-2.5 pl-10 pr-4 text-[13.5px] text-ink placeholder:text-ink-3 focus-visible:border-signal"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {distinctSpeakers.map((sid) => (
            <span key={sid} className="flex items-center gap-1.5">
              <span
                className={`font-mono text-[10.5px] uppercase tracking-wider ${speakerColor(sid)}`}
              >
                {labelFor(sid)}
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

      {visible.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No matches"
          description={`Nothing in this transcript matches “${q}”.`}
        />
      ) : (
        /* The scroll container is the virtualizer's viewport. Fixed height on purpose: a
           virtualizer needs a bounded scroll parent to know what is on screen. */
        <div ref={scrollRef} className="mt-6 h-[62vh] min-h-[360px] overflow-y-auto pr-1">
          <ol
            className="relative border-l border-line pl-5"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const c = visible[row.index];
              return (
                <li
                  key={c.id}
                  data-index={row.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 w-full pl-5"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <div className="flex items-baseline gap-3">
                    <button
                      type="button"
                      onClick={() => virtualizer.scrollToIndex(row.index, { align: "start" })}
                      className="font-mono text-[10.5px] tabular-nums text-ink-3 transition-colors hover:text-signal-deep"
                      title="Jump to this moment"
                    >
                      {formatOffset(c.start_ms)}
                    </button>
                    <span
                      className={`font-mono text-[10.5px] uppercase tracking-wider ${speakerColor(
                        c.speaker_id,
                      )}`}
                    >
                      {labelFor(c.speaker_id)}
                    </span>
                    {c.redacted && (
                      <span
                        className="rounded-pill bg-pill px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-3"
                        title="Personal data in this line was replaced before it was stored"
                      >
                        Redacted
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-[72ch] pb-5 text-[14.5px] leading-relaxed text-ink">
                    {highlight(c.text, q)}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
