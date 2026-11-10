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
import { CaretDown, CaretUp, MagnifyingGlass } from "@phosphor-icons/react";
import { TranscriptHead } from "@/components/transcript/TranscriptHead";
import { initials, toneOf } from "@/components/room/tone";
import {
  formatOffset,
  resolveSpeaker,
  wordCount,
} from "@/components/meetings/transcript-utils";
import type { TranscriptChunk, MeetingSpeaker } from "@/lib/api/transcript";

/* The transcript screen: a title row, the transcript card (search with match stepping, the
   speaker notice, then the lines) and a rail of cards on the right (speakers, talk time). Plan 3-4
   §3.8 step 2: ordered finals, virtualized, timestamp jump. A linked moment (a `#t=` deep link
   from the meeting page, or a timestamp you click) is marked with the coral line: the line the
   rest of the product carried forward from.

   VIRTUALIZED, because the plan says "never render un-virtualized" and means it: the capacity
   model puts a meeting at roughly 360 finals, and an un-virtualized list of that many rows with
   per-row highlighting re-renders the whole document on every keystroke in the search box.
   Jumping is `scrollToIndex` against the virtualizer, never an `href="#id"` anchor: once rows are
   windowed the target element does not exist in the DOM until it is scrolled near.

   Search keeps every line in place, marks each match and dims the lines without one (the
   design's behaviour), with previous and next stepping through matches (Enter, Shift+Enter).

   Speaker labels resolve through `meeting_speakers`, never guessed here: an unmapped speaker
   reads as "Speaker 0" rather than this component inventing a name for it.

   The rail arrives as server-rendered children, so this island only owns what is interactive. */

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
    parts.push(
      <mark key={`m${ordinal}`} data-current={ordinal === current ? "true" : undefined}>
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
  title,
  meta,
  backHref,
  rail,
}: {
  chunks: TranscriptChunk[];
  speakers?: MeetingSpeaker[];
  /** `user_id` to display name, resolved by the page. This component never fetches. */
  speakerNames?: Record<string, string>;
  /** `speaker_id` to display label, for sources that already carry names (the mock fixtures). */
  speakerLabels?: Record<string, string>;
  /** A banner shown at the top of the transcript panel, such as unassigned speakers. */
  notice?: ReactNode;
  title: string;
  meta: string;
  backHref: string;
  /** The left rail panels (overview, speakers, talk time), rendered by the page. */
  rail?: ReactNode;
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
    const counts: number[] = new Array(chunks.length).fill(0);
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
          counts[i] += 1;
          from = at + needle.length;
        }
      });
    }
    return { starts, counts, lineOfMatch };
  }, [chunks, q]);
  const total = search.lineOfMatch.length;
  const currentMatch = Math.min(current, Math.max(total - 1, 0));

  const words = useMemo(() => chunks.reduce((n, c) => n + wordCount(c.text), 0), [chunks]);
  const interims = useMemo(() => chunks.filter((c) => !c.is_final).length, [chunks]);

  const virtualizer = useVirtualizer({
    count: chunks.length,
    getScrollElement: () => scrollRef.current,
    // A line is one or two rows at this measure; `measureElement` corrects it per row.
    estimateSize: () => 44,
    overscan: 10,
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

  const clear = () => {
    setQuery("");
    setCurrent(0);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      step(e.shiftKey ? -1 : 1);
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      clear();
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
    <div className="mx-page tx" id="page-transcript">
      <TranscriptHead title={title} meta={meta} backHref={backHref} />

      <div className="tx-layout">
        <section className="mx-card tx-main" aria-label="Transcript">
          <div className="tx-bar">
            <div className="mt-search tx-search" role="search">
              <MagnifyingGlass size={18} aria-hidden />
              <input
                ref={searchRef}
                type="search"
                placeholder="Search this transcript"
                aria-label="Search this transcript"
                aria-keyshortcuts="/"
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrent(0);
                }}
                onKeyDown={onSearchKey}
              />
              {q && (
                <span className="tx-step">
                  <span className="tx-step-count" aria-live="polite">
                    {total ? `${currentMatch + 1} of ${total}` : "No matches"}
                  </span>
                  <button
                    type="button"
                    className="cx-icon-btn sm tap"
                    aria-label="Previous match"
                    disabled={total === 0}
                    onClick={() => step(-1)}
                  >
                    <CaretUp size={16} weight="bold" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="cx-icon-btn sm tap"
                    aria-label="Next match"
                    disabled={total === 0}
                    onClick={() => step(1)}
                  >
                    <CaretDown size={16} weight="bold" aria-hidden />
                  </button>
                </span>
              )}
            </div>
          </div>

          {notice}

          <div className="tx-legend">
            <span>
              {chunks.length.toLocaleString("en-US")} {chunks.length === 1 ? "line" : "lines"}, {words.toLocaleString("en-US")} words
            </span>
            {interims > 0 ? (
              <>
                <span className="tx-legend-key">
                  <i className="tx-sw" aria-hidden="true" />
                  Final
                </span>
                <span className="tx-legend-key">
                  <i className="tx-sw is-interim" aria-hidden="true" />
                  Interim, still being refined
                </span>
              </>
            ) : null}
          </div>

          {q && total === 0 ? (
            <div className="tx-none" role="status">
              <MagnifyingGlass size={30} aria-hidden className="tx-none-ico" />
              <h3>No lines match &ldquo;{q}&rdquo;</h3>
              <p>Check the spelling or try a shorter word.</p>
              <button type="button" className="mx-btn is-outline is-sm tap" onClick={clear}>
                Clear search
              </button>
            </div>
          ) : (
            <div ref={scrollRef} tabIndex={0} role="region" aria-label="Transcript lines" className="tx-scroll">
              <ol className="tx-list" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {virtualizer.getVirtualItems().map((row) => {
                  const c = chunks[row.index];
                  const who = resolveSpeaker(c.speaker_id, speakers, speakerNames, speakerLabels);
                  const isActive = activeId === c.id;
                  const dim = Boolean(q) && search.counts[row.index] === 0;
                  const stamp = formatOffset(c.start_ms);
                  return (
                    <li
                      key={c.id}
                      data-index={row.index}
                      ref={virtualizer.measureElement}
                      className="tx-item"
                      style={{ transform: `translateY(${row.start}px)` }}
                    >
                      <div className={`tr-row${dim ? " is-dim" : ""}${isActive ? " is-active" : ""}`}>
                        <span className="tr-when">
                          <button
                            type="button"
                            className="tr-time tap"
                            onClick={() => toggleActive(c)}
                            aria-pressed={isActive}
                            aria-label={`Link to the moment at ${stamp}`}
                          >
                            {stamp}
                          </button>
                          {isActive ? (
                            <svg className="tr-thread" viewBox="0 0 44 14" aria-hidden="true">
                              <path className="mx-line" d="M2 7 H32" />
                              <circle className="mx-bead" cx="37" cy="7" r="4" />
                            </svg>
                          ) : null}
                        </span>
                        <span className={`tr-who${who.named ? "" : " is-unk"}`} title={who.label}>
                          <span className={`mx-av sm ${who.named ? toneOf(c.speaker_id) : ""}`} aria-hidden="true">
                            {who.named ? initials(who.label) : "?"}
                          </span>
                          <b>{who.label}</b>
                        </span>
                        <div className="tr-body">
                          <p className={`tr-text${c.is_final ? "" : " is-interim"}`}>
                            {highlight(c.text, q, search.starts[row.index], currentMatch)}
                            {!c.is_final && (
                              <span className="tx-flag" title="Still being refined">
                                Interim
                              </span>
                            )}
                            {c.redacted && (
                              <span className="tx-flag" title="Personal data in this line was replaced before it was stored">
                                Redacted
                              </span>
                            )}
                          </p>
                          {isActive ? <p className="tr-linked">Linked moment. The address bar now points here, ready to share.</p> : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>

        <aside className="tx-rail" aria-label="Speakers and talk time">
          {rail}
        </aside>
      </div>
    </div>
  );
}
