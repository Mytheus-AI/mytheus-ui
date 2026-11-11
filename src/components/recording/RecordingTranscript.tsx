"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LockSimple, Scissors } from "@phosphor-icons/react";
import {
  clock,
  currentLineIndex,
  lengthLabel,
  spanOfLines,
  spokenClock,
  transcriptItems,
  type Line,
  type Span,
} from "./recording-model";

/* The transcript beside the player. Each line's time is a button that plays from there (a click on
   the words does the same, unless you are selecting text); the line playing now is highlighted and
   kept in view while "Follow along" is on (scrolling yourself pauses that for a few seconds).
   Off-the-record stretches sit between the lines where they happened. Select a run of lines with
   the mouse (or use "Clip this line" from the keyboard) to start a clip from exactly those words. */

const FOLLOW_PAUSE_MS = 8000;

export function RecordingTranscript({
  lines,
  offRecord,
  playheadMs,
  canPlay,
  highlight,
  onSeek,
  onClipSpan,
}: {
  lines: Line[];
  offRecord: Span[];
  playheadMs: number | null;
  canPlay: boolean;
  /** a span to tint (the clip being made, or a clip being shown) */
  highlight: Span | null;
  onSeek: (ms: number) => void;
  onClipSpan: (span: Span, fromIndex: number) => void;
}) {
  const ids = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  const [selection, setSelection] = useState<{ a: number; b: number } | null>(null);
  const userScrolledAt = useRef(0);
  const items = useMemo(() => transcriptItems(lines, offRecord), [lines, offRecord]);
  const current = playheadMs === null ? -1 : currentLineIndex(lines, playheadMs);

  // Keep the playing line in view, inside the panel only (never scrolling the page).
  useEffect(() => {
    if (!follow || current < 0 || Date.now() - userScrolledAt.current < FOLLOW_PAUSE_MS) return;
    const box = scroller.current;
    const row = box?.querySelector<HTMLElement>(`[data-index="${current}"]`);
    if (!box || !row) return;
    const top = row.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 40 || top + row.offsetHeight > box.scrollTop + box.clientHeight - 40) {
      const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: reduce ? "auto" : "smooth" });
    }
  }, [current, follow]);

  const readSelection = useCallback(() => {
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    const box = scroller.current;
    if (!sel || sel.isCollapsed || !box || !sel.anchorNode || !sel.focusNode) {
      setSelection(null);
      return;
    }
    const rowOf = (n: Node) => (n instanceof Element ? n : n.parentElement)?.closest<HTMLElement>("[data-index]") ?? null;
    const a = rowOf(sel.anchorNode);
    const b = rowOf(sel.focusNode);
    if (!a || !b || !box.contains(a) || !box.contains(b)) {
      setSelection(null);
      return;
    }
    setSelection({ a: Number(a.dataset.index), b: Number(b.dataset.index) });
  }, []);

  const selected = selection ? spanOfLines(lines, selection.a, selection.b) : null;

  if (lines.length === 0) {
    return (
      <div className="rec-tx is-empty">
        <p className="rec-quiet">No transcript was kept for this call, so there are no lines to follow or clip.</p>
      </div>
    );
  }

  return (
    <div className="rec-tx">
      <div className="rec-tx-head">
        <h3 className="rec-sub" id={`${ids}-h`}>
          Transcript
        </h3>
        {canPlay ? (
          <label className="rec-switch">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
            <span>Follow along</span>
          </label>
        ) : null}
      </div>
      {selected ? (
        <div className="rec-selbar" role="status">
          <span>
            Selected {clock(selected.startMs)} to {clock(selected.endMs)}, {lengthLabel(selected.endMs - selected.startMs)}
          </span>
          <button
            type="button"
            className="mx-btn is-sm tap"
            onClick={() => {
              onClipSpan(selected, Math.min(selection!.a, selection!.b));
              window.getSelection()?.removeAllRanges();
              setSelection(null);
            }}
          >
            <Scissors size={16} aria-hidden="true" />
            Make a clip
          </button>
        </div>
      ) : null}
      <div
        ref={scroller}
        className="rec-tx-scroll"
        role="region"
        aria-labelledby={`${ids}-h`}
        tabIndex={0}
        onWheel={() => (userScrolledAt.current = Date.now())}
        onTouchMove={() => (userScrolledAt.current = Date.now())}
        onMouseUp={readSelection}
        onKeyUp={(e) => {
          if (e.shiftKey) readSelection();
        }}
      >
        <ol className="rec-lines">
          {items.map((item) => {
            if (item.kind === "gap") {
              const len = item.gap.endMs - item.gap.startMs;
              return (
                <li key={item.key} className="rec-gap">
                  <LockSimple size={16} aria-hidden="true" />
                  <span>
                    <strong>Off the record</strong>
                    {len > 0 ? `, ${lengthLabel(len)}` : ""}. Nothing from this stretch was kept.
                  </span>
                </li>
              );
            }
            const { line, index } = item;
            const isCurrent = index === current;
            const inSpan = !!highlight && line.startMs < highlight.endMs && line.endMs > highlight.startMs;
            const inSel = !!selection && index >= Math.min(selection.a, selection.b) && index <= Math.max(selection.a, selection.b);
            return (
              <li
                key={line.id}
                data-index={index}
                className={`rec-line${isCurrent ? " is-current" : ""}${inSpan ? " is-span" : ""}${inSel ? " is-sel" : ""}`}
                aria-current={isCurrent ? "true" : undefined}
              >
                <button
                  type="button"
                  className="rec-line-time tap"
                  onClick={() => onSeek(line.startMs)}
                  aria-label={`${canPlay ? "Play from" : "Go to"} ${spokenClock(line.startMs)}, ${line.speaker}`}
                >
                  {clock(line.startMs)}
                </button>
                <div className="rec-line-body">
                  <span className="rec-line-who">{line.speaker}</span>
                  {/* A click on the words seeks too, unless the click finished a text selection. */}
                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                  <p
                    className="rec-line-text"
                    onClick={() => {
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed) return;
                      onSeek(line.startMs);
                    }}
                  >
                    {line.text}
                  </p>
                </div>
                <button
                  type="button"
                  className="rec-line-clip tap"
                  onClick={() => onClipSpan({ startMs: line.startMs, endMs: Math.max(line.endMs, line.startMs + 1000) }, index)}
                  aria-label={`Clip this line, ${spokenClock(line.startMs)}`}
                  title="Clip this line"
                >
                  <Scissors size={15} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="rec-tx-hint">Select lines with the mouse to clip exactly those words.</p>
    </div>
  );
}
