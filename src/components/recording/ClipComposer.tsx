"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Crosshair, Play, Scissors, X } from "@phosphor-icons/react";
import { createClip } from "@/app/actions/recording";
import { notifySuccess } from "@/lib/toast";
import {
  CLIP_FAILURE_COPY,
  CLIP_PROBLEM_COPY,
  clipProblem,
  clock,
  lengthLabel,
  parseClock,
  type Clip,
  type Span,
} from "./recording-model";

/* Making a clip: a title, a start and an end on the meeting's clock. The times come from the
   transcript (the lines you selected, or "Clip this line") or from the playhead ("Set to
   playhead"), and can be typed (`12:04`). The rules are checked as you go: at most 10 minutes,
   the end after the start, and never across a stretch that was off the record. */

export function ClipComposer({
  meetingId,
  initial,
  offRecord,
  playheadMs,
  canPlay,
  onPreview,
  onSpan,
  onSaved,
  onCancel,
}: {
  meetingId: string;
  initial: { span: Span; title: string };
  offRecord: Span[];
  playheadMs: number | null;
  canPlay: boolean;
  onPreview: (span: Span) => void;
  onSpan: (span: Span | null) => void;
  onSaved: (clip: Clip) => void;
  onCancel: () => void;
}) {
  const ids = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial.title);
  const [startText, setStartText] = useState(clock(initial.span.startMs));
  const [endText, setEndText] = useState(clock(initial.span.endMs));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initial.title);
    setStartText(clock(initial.span.startMs));
    setEndText(clock(initial.span.endMs));
    setError(null);
    titleRef.current?.focus();
  }, [initial]);

  const start = parseClock(startText);
  const end = parseClock(endText);
  const span = start !== null && end !== null ? { startMs: start, endMs: end } : null;
  const problem = span ? clipProblem(span, offRecord) : null;
  const badTime = start === null || end === null;

  useEffect(() => onSpan(span && !problem ? span : null), [span?.startMs, span?.endMs, problem]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!span || problem || !title.trim()) {
      setError(!title.trim() ? "Give the clip a title." : badTime ? "Use times like 12:04." : problem ? CLIP_PROBLEM_COPY[problem] : null);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createClip(meetingId, { title, startMs: span.startMs, endMs: span.endMs });
    setBusy(false);
    if (!res.ok) {
      setError(CLIP_FAILURE_COPY[res.failure === "confirm" ? "error" : res.failure]);
      return;
    }
    notifySuccess("Clip saved", { description: `${clock(res.clip.start_ms)} to ${clock(res.clip.end_ms)}` });
    onSaved(res.clip);
  };

  return (
    <form
      className="rec-compose"
      aria-labelledby={`${ids}-h`}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="rec-compose-head">
        <h3 className="rec-sub" id={`${ids}-h`}>
          New clip
        </h3>
        <button type="button" className="rec-btn is-quiet tap" onClick={onCancel} aria-label="Cancel the clip">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <label className="rec-field">
        <span>Title</span>
        <input ref={titleRef} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <div className="rec-times">
        <div className="rec-field">
          <label htmlFor={`${ids}-s`}>Start</label>
          <div className="rec-time-row">
            <input
              id={`${ids}-s`}
              value={startText}
              inputMode="numeric"
              aria-describedby={`${ids}-fmt`}
              aria-invalid={start === null}
              onChange={(e) => setStartText(e.target.value)}
            />
            {canPlay && playheadMs !== null ? (
              <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => setStartText(clock(playheadMs))}>
                <Crosshair size={16} aria-hidden="true" />
                Set to playhead
              </button>
            ) : null}
          </div>
        </div>
        <div className="rec-field">
          <label htmlFor={`${ids}-e`}>End</label>
          <div className="rec-time-row">
            <input
              id={`${ids}-e`}
              value={endText}
              inputMode="numeric"
              aria-describedby={`${ids}-fmt`}
              aria-invalid={end === null}
              onChange={(e) => setEndText(e.target.value)}
            />
            {canPlay && playheadMs !== null ? (
              <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => setEndText(clock(playheadMs))}>
                <Crosshair size={16} aria-hidden="true" />
                Set to playhead
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <p id={`${ids}-fmt`} className="rec-quiet">
        Times on the meeting&rsquo;s clock, like 12:04. At most 10 minutes.
      </p>
      <p className={`rec-compose-len${problem || badTime ? " is-bad" : ""}`} role="status" aria-live="polite">
        {badTime ? "Use times like 12:04." : problem ? CLIP_PROBLEM_COPY[problem] : span ? `${lengthLabel(span.endMs - span.startMs)} clip` : ""}
      </p>
      {error ? (
        <p className="rec-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="rec-compose-acts">
        {canPlay ? (
          <button
            type="button"
            className="mx-btn is-outline tap"
            disabled={!span || !!problem}
            onClick={() => span && onPreview(span)}
          >
            <Play size={16} weight="fill" aria-hidden="true" />
            Preview
          </button>
        ) : null}
        <button type="submit" className="mx-btn tap" disabled={busy} aria-busy={busy}>
          <Scissors size={16} aria-hidden="true" />
          {busy ? "Saving clip..." : "Save clip"}
        </button>
      </div>
    </form>
  );
}
