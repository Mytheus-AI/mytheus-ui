"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CaretDown, CaretUp, MagnifyingGlass, Question } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/meetings/Chip";
import { PanelEmpty } from "@/components/meetings/PanelEmpty";
import {
  formatOffset,
  resolveSpeaker,
  wordCount,
} from "@/components/meetings/transcript-utils";
import type { TranscriptChunk, MeetingSpeaker } from "@/lib/api/transcript";

/* The transcript reader. Plan 3-4 §3.8 step 2: ordered finals, virtualized, timestamp jump.
 *
 * VIRTUALIZED, because the plan says "never render un-virtualized" and means it: the capacity
 * model puts a meeting at roughly 360 finals, and an un-virtualized list of that many rows with
 * per-row highlighting re-renders the whole document on every keystroke in the search box.
 *
 * Virtualization and jump-to-timestamp interact, which is why they are solved together here.
 * Jumping is `scrollToIndex` against the virtualizer, never an `href="#id"` anchor: once rows are
 * windowed the target element does not exist in the DOM until it is scrolled near.
 *
 * Search keeps every line on screen and marks each match, with previous and next stepping through
 * them (Enter, Shift+Enter), because a reader wants a hit in context, not a filtered list.
 *
 * Speaker labels resolve through `meeting_speakers`, never guessed here. `transcript_chunks`
 * carries the raw diarized label ("0", "1") exactly as the provider emitted it, and the
 * `speaker_id` to `user_id` mapping is a separate, user-correctable record, so an unmapped
 * speaker reads as "Speaker 0" rather than this component inventing a name for it.
 *
 * The scroll container is this card's own: fixed height on purpose, because a virtualizer needs a
 * bounded scroll parent to know what is on screen. */

const ICON_BTN =
  "grid h-8 w-8 place-items-center rounded-pill text-ink-2 transition-[background-color,color,transform] duration-150 hover:bg-bg-2 hover:text-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";

/** Marks every case-insensitive occurrence of `query` in `text`. `startOrdinal` is the running
 *  index of this line's first match across the whole transcript, so the current match can be
 *  singled out. */
function highlight(text: string, query: string, startOrdinal: number, current: number): ReactNode {
  if (!query) return text;
  const needle = query.toLowerCase();
  const hay = text.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let ordinal = startOrdinal;
  for (;;) {
    const i = hay.indexOf(needle, from);
    if (i === -1) break;
    if (i > from) parts.push(text.slice(from, i));
    const isCurrent = ordinal === current;
    parts.push(
      <mark
        key={ordinal}
        data-current={isCurrent ? "true" : undefined}
        className={`rounded px-0.5 ${
          isCurrent
            ? "bg-signal-deep text-white [.mx-app[data-theme=dark]_&]:text-bg"
            : "bg-[color-mix(in_srgb,var(--signal)_34%,transparent)] text-ink"
        }`}
      >
        {text.slice(i, i + query.length)}
      </mark>,
    );
    from = i + query.length;
    ordinal += 1;
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}

export function TranscriptView({
  chunks,
  speakers = [],
  speakerNames = {},
  speakerLabels = {},
  notice,
}: {
  chunks: TranscriptChunk[];
  speakers?: MeetingSpeaker[];
  /** `user_id` to display name, resolved by the page. This component never fetches. */
  speakerNames?: Record<string, string>;
  /** `speaker_id` to display label, for sources that already carry names (the mock fixtures). */
  speakerLabels?: Record<string, string>;
  /** A banner shown under the search bar, such as unassigned speakers. */
  notice?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const jumped = useRef(false);

  const q = query.trim();

  const search = useMemo(() => {
    const starts: number[] = new Array(chunks.length).fill(0);
    const lineOfMatch: number[] = [];
    if (q) {
      const needle = q.toLowerCase();
      chunks.forEach((c, i) => {
        starts[i] = lineOfMatch.length;
        const hay = c.text.toLowerCase();
        let from = 0;
        for (;;) {
          const at = hay.indexOf(needle, from);
          if (at === -1) break;
          lineOfMatch.push(i);
          from = at + needle.length;
        }
      });
    }
    return { starts, lineOfMatch };
  }, [chunks, q]);
  const total = search.lineOfMatch.length;

  const totals = useMemo(
    () => ({ lines: chunks.length, words: chunks.reduce((n, c) => n + wordCount(c.text), 0) }),
    [chunks],
  );

  const virtualizer = useVirtualizer({
    count: chunks.length,
    getScrollElement: () => scrollRef.current,
    // A turn is usually two or three lines at this measure; `measureElement` below corrects the
    // estimate per row, so this only has to be close enough to size the scrollbar sensibly.
    estimateSize: () => 96,
    overscan: 8,
  });

  // Step to the current match whenever the match or the query changes.
  useEffect(() => {
    if (!q || total === 0) return;
    const line = search.lineOfMatch[Math.min(current, total - 1)];
    virtualizer.scrollToIndex(line, { align: "center" });
  }, [q, current, total, search, virtualizer]);

  // A `#t=seconds` deep link (from the meeting page) lands on the line spoken at that second.
  useEffect(() => {
    if (jumped.current || chunks.length === 0) return;
    const m = window.location.hash.match(/t=(\d+)/);
    if (!m) return;
    jumped.current = true;
    const ms = Number(m[1]) * 1000;
    let idx = 0;
    chunks.forEach((c, i) => {
      if (c.start_ms <= ms) idx = i;
    });
    setActiveId(chunks[idx].id);
    requestAnimationFrame(() => virtualizer.scrollToIndex(idx, { align: "center" }));
  }, [chunks, virtualizer]);

  // "/" jumps to the search box, the way it does elsewhere in the app.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const step = (dir: 1 | -1) => {
    if (total === 0) return;
    setCurrent((c) => (c + dir + total) % total);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      step(e.shiftKey ? -1 : 1);
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      setQuery("");
      setCurrent(0);
    }
  };

  const toggleActive = (c: TranscriptChunk) => {
    const next = activeId === c.id ? null : c.id;
    setActiveId(next);
    try {
      const url = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", next ? `${url}#t=${Math.floor(c.start_ms / 1000)}` : url);
    } catch {
      // History can be unavailable in embedded views; the highlight still applies.
    }
  };

  return (
    <section
      aria-label="Transcript"
      className="flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface"
    >
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-3 py-3 min-[700px]:px-4">
        <label className="relative block min-w-[180px] flex-1">
          <span className="sr-only">Search this transcript</span>
          <MagnifyingGlass
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrent(0);
            }}
            onKeyDown={onSearchKey}
            placeholder="Search this transcript"
            autoComplete="off"
            className="h-11 w-full rounded-pill border border-line-2 bg-surface pl-10 pr-3 text-[14px] text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-signal"
          />
        </label>
        {q && (
          <div className="inline-flex items-center gap-0.5">
            <button
              type="button"
              className={ICON_BTN}
              aria-label="Previous match"
              disabled={total === 0}
              onClick={() => step(-1)}
            >
              <CaretUp size={16} aria-hidden />
            </button>
            <span
              className="min-w-[64px] text-center text-[12.5px] font-semibold text-ink-3"
              aria-live="polite"
            >
              {total ? `${Math.min(current, total - 1) + 1} of ${total}` : "0 results"}
            </span>
            <button
              type="button"
              className={ICON_BTN}
              aria-label="Next match"
              disabled={total === 0}
              onClick={() => step(1)}
            >
              <CaretDown size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {notice}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-bg px-4 py-2.5 text-[12.5px] text-ink-3">
        <span>The final transcript is the durable record. Interim captions are never stored.</span>
        <span>
          {totals.lines} lines, {totals.words.toLocaleString("en-US")} words
        </span>
      </div>

      {q && total === 0 ? (
        <div className="p-4">
          <PanelEmpty
            role="status"
            className="border-0 py-10"
            icon={<MagnifyingGlass size={34} />}
            title={`No lines match “${q}”`}
            description="Check the spelling or try a shorter word."
            action={
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCurrent(0);
                }}
                className="h-11 rounded-pill border border-line-2 px-5 text-[14px] font-semibold text-ink transition-[background-color,transform] duration-150 hover:bg-bg active:scale-[0.98]"
              >
                Clear search
              </button>
            }
          />
        </div>
      ) : (
        <div
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-label="Transcript lines"
          className="h-[66dvh] min-h-[380px] overflow-y-auto px-1 pb-6 pt-2 min-[700px]:h-[62dvh] min-[1100px]:h-[calc(100dvh-23rem)] min-[1100px]:min-h-[380px]"
        >
          <ol className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((row) => {
              const c = chunks[row.index];
              const who = resolveSpeaker(c.speaker_id, speakers, speakerNames, speakerLabels);
              const isActive = activeId === c.id;
              const stamp = formatOffset(c.start_ms);
              return (
                <li
                  key={c.id}
                  data-index={row.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full px-1 pb-0.5"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <div
                    className={`grid grid-cols-[54px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1 rounded-xl px-2.5 py-2.5 transition-colors duration-200 motion-reduce:transition-none min-[700px]:grid-cols-[64px_148px_minmax(0,1fr)] min-[700px]:gap-x-3 min-[700px]:pl-3 min-[700px]:pr-3.5 ${
                      isActive ? "bg-signal-soft" : "hover:bg-bg"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      aria-pressed={isActive}
                      aria-label={`Highlight line at ${stamp}`}
                      className="col-start-1 row-start-1 justify-self-start rounded-md py-0.5 text-[12.5px] font-bold tabular-nums text-ink-3 transition-colors hover:text-signal-deep hover:underline hover:underline-offset-[3px] active:opacity-70"
                    >
                      {stamp}
                    </button>
                    <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2 pt-px text-[13.5px] font-semibold text-ink">
                      {who.named ? (
                        <Avatar name={who.label} size="sm" />
                      ) : (
                        <span
                          aria-hidden
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-dashed border-priority-medium bg-priority-medium-soft text-priority-medium"
                        >
                          <Question size={14} weight="bold" />
                        </span>
                      )}
                      <b
                        className={`truncate font-semibold ${who.named ? "" : "italic text-ink-2"}`}
                        title={who.label}
                      >
                        {who.label}
                      </b>
                    </div>
                    <div className="col-span-2 row-start-2 min-w-0 min-[700px]:col-span-1 min-[700px]:col-start-3 min-[700px]:row-start-1">
                      <p
                        className={`text-[14.5px] leading-[1.55] ${
                          c.is_final ? "text-ink-2" : "italic text-ink-3"
                        }`}
                      >
                        {highlight(c.text, q, search.starts[row.index], Math.min(current, Math.max(total - 1, 0)))}
                        {!c.is_final && (
                          <Chip className="ml-2 h-5 align-[1px] text-[11px] not-italic" title="Still being refined">
                            interim
                          </Chip>
                        )}
                        {c.redacted && (
                          <Chip
                            className="ml-2 h-5 align-[1px] text-[11px] not-italic"
                            title="Personal data in this line was replaced before it was stored"
                          >
                            Redacted
                          </Chip>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
