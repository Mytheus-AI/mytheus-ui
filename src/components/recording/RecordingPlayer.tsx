"use client";

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowArcLeft,
  ArrowArcRight,
  ArrowsIn,
  ArrowsOut,
  ClosedCaptioning,
  Pause,
  Play,
} from "@phosphor-icons/react";
import {
  JUMP_STEP_MS,
  SEEK_STEP_MS,
  SPEEDS,
  captionsVtt,
  clock,
  lengthLabel,
  locate,
  spokenClock,
  timelineSpan,
  type Gap,
  type Line,
  type PlayableSegment,
  type Span,
} from "./recording-model";

/* The recording's player. One <video> plays one segment at a time; the controls work on the
   meeting's clock (the same times the transcript shows), so a meeting taken off the record plays
   as one timeline with its gaps marked, skipping each gap and saying so.

   Keyboard (anywhere in the player, outside a text field): Space or K plays and pauses, Left and
   Right move 5 seconds, J and L move 10, C turns captions on and off, F goes full screen. The seek
   slider is a native range (arrows move 5 seconds, Page Up and Page Down a minute). Captions are a
   WebVTT track made from the transcript, with each line's speaker as its voice. */

export type PlayerHandle = {
  seek: (ms: number, opts?: { play?: boolean }) => void;
  playSpan: (span: Span) => void;
  stopSpan: () => void;
  focus: () => void;
};

type Props = {
  segments: PlayableSegment[];
  gaps: Gap[];
  lines: Line[];
  title: string;
  /** every time the playhead moves (meeting clock) */
  onTime: (ms: number) => void;
  /** a segment URL failed (usually expired): fresh segments, or null when none could be had */
  onRefresh: () => Promise<PlayableSegment[] | null>;
  /** URLs are about to expire: ask for fresh ones before playing */
  urlsExpireAt: number | null;
};

export const RecordingPlayer = forwardRef<PlayerHandle, Props>(function RecordingPlayer(
  { segments: initialSegments, gaps, lines, title, onTime, onRefresh, urlsExpireAt },
  ref,
) {
  const ids = useId();
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState(initialSegments);
  const [index, setIndex] = useState(0);
  const [ms, setMs] = useState(initialSegments[0]?.startMs ?? 0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [captions, setCaptions] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const pending = useRef<{ localMs: number; play: boolean } | null>(null);
  const until = useRef<number | null>(null);
  const retried = useRef(0);

  useEffect(() => setSegments(initialSegments), [initialSegments]);

  const span = useMemo(() => timelineSpan(segments), [segments]);
  const seg = segments[index] ?? null;
  const total = span.endMs - span.startMs;

  const vttUrl = useMemo(() => {
    if (!seg || typeof URL === "undefined" || typeof Blob === "undefined") return null;
    return URL.createObjectURL(new Blob([captionsVtt(lines, seg)], { type: "text/vtt" }));
  }, [lines, seg]);
  useEffect(() => () => (vttUrl ? URL.revokeObjectURL(vttUrl) : undefined), [vttUrl]);

  const applyCaptions = useCallback((on: boolean) => {
    const track = video.current?.textTracks?.[0];
    if (track) track.mode = on ? "showing" : "hidden";
  }, []);
  useEffect(() => applyCaptions(captions), [captions, applyCaptions, vttUrl]);
  useEffect(() => {
    if (video.current) video.current.playbackRate = rate;
  }, [rate, index]);

  const freshen = useCallback(async () => {
    if (urlsExpireAt === null || urlsExpireAt - Date.now() > 45_000) return true;
    const next = await onRefresh();
    if (next && next.length) setSegments(next);
    return !!next;
  }, [onRefresh, urlsExpireAt]);

  const seek = useCallback(
    (target: number, opts: { play?: boolean } = {}) => {
      const at = locate(segments, Math.max(span.startMs, Math.min(span.endMs, target)));
      if (!at) return;
      const el = video.current;
      const wantPlay = opts.play ?? playing;
      if (at.skipped) {
        const gap = gaps.find((g) => g.endMs === segments[at.index].startMs);
        setNotice(
          gap
            ? `That part was ${gap.kind === "off_record" ? "off the record" : "not recorded"}. Playing from ${clock(segments[at.index].startMs)}.`
            : `Playing from ${clock(segments[at.index].startMs)}.`,
        );
      }
      if (at.index !== index) {
        pending.current = { localMs: at.localMs, play: wantPlay };
        setIndex(at.index);
      } else if (el) {
        el.currentTime = at.localMs / 1000;
        if (wantPlay) void el.play().catch(() => setPlaying(false));
      }
      setMs(segments[at.index].startMs + at.localMs);
      onTime(segments[at.index].startMs + at.localMs);
    },
    [gaps, index, onTime, playing, segments, span.endMs, span.startMs],
  );

  const toggle = useCallback(async () => {
    const el = video.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    until.current = null;
    await freshen();
    void el.play().catch(() => setPlaying(false));
  }, [freshen]);

  useImperativeHandle(
    ref,
    () => ({
      seek,
      playSpan: (s: Span) => {
        until.current = s.endMs;
        void freshen().then(() => seek(s.startMs, { play: true }));
      },
      stopSpan: () => {
        until.current = null;
      },
      focus: () => frame.current?.focus(),
    }),
    [freshen, seek],
  );

  // A new segment is in the element: go where we were asked.
  const onLoaded = () => {
    const el = video.current;
    if (!el) return;
    el.playbackRate = rate;
    applyCaptions(captions);
    const want = pending.current;
    pending.current = null;
    if (want) {
      el.currentTime = want.localMs / 1000;
      if (want.play) void el.play().catch(() => setPlaying(false));
    }
  };

  const onTimeUpdate = () => {
    const el = video.current;
    if (!el || !seg) return;
    const now = seg.startMs + el.currentTime * 1000;
    setMs(now);
    onTime(now);
    if (until.current !== null && now >= until.current) {
      until.current = null;
      el.pause();
      setNotice("End of the clip.");
    }
  };

  const onEnded = () => {
    if (index < segments.length - 1) {
      const next = segments[index + 1];
      const gap = next.startMs - (seg?.endMs ?? next.startMs);
      const kind = gaps.find((g) => g.endMs === next.startMs)?.kind;
      setNotice(
        `Skipped ${lengthLabel(gap)} ${kind === "off_record" ? "that was off the record" : "that was not recorded"}.`,
      );
      pending.current = { localMs: 0, play: true };
      setIndex(index + 1);
    } else {
      setPlaying(false);
    }
  };

  const onError = async () => {
    if (retried.current >= 2) {
      setFailed(true);
      return;
    }
    retried.current += 1;
    const el = video.current;
    const local = el ? el.currentTime * 1000 : 0;
    const next = await onRefresh();
    if (!next || !next.length) {
      setFailed(true);
      return;
    }
    pending.current = { localMs: local, play: playing };
    setSegments(next);
  };

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.current?.requestFullscreen?.().catch(() => undefined);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, select, textarea")) return;
    const onButton = t.closest("button") !== null;
    switch (e.key) {
      case " ":
      case "k":
      case "K":
        if (onButton && e.key === " ") return;
        e.preventDefault();
        void toggle();
        break;
      case "ArrowLeft":
        e.preventDefault();
        seek(ms - SEEK_STEP_MS);
        break;
      case "ArrowRight":
        e.preventDefault();
        seek(ms + SEEK_STEP_MS);
        break;
      case "j":
      case "J":
        seek(ms - JUMP_STEP_MS);
        break;
      case "l":
      case "L":
        seek(ms + JUMP_STEP_MS);
        break;
      case "c":
      case "C":
        setCaptions((c) => !c);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      default:
    }
  };

  const onRangeKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -SEEK_STEP_MS : e.key === "ArrowRight" || e.key === "ArrowUp" ? SEEK_STEP_MS : e.key === "PageDown" ? -60_000 : e.key === "PageUp" ? 60_000 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    seek(ms + step);
  };

  if (!seg) return null;
  const pct = (v: number) => (total > 0 ? ((v - span.startMs) / total) * 100 : 0);
  const audioOnly = seg.mediaType.startsWith("audio/");

  return (
    <div
      ref={frame}
      className={`rec-player${audioOnly ? " is-audio" : ""}${fullscreen ? " is-full" : ""}`}
      role="group"
      aria-label={`Recording of ${title}`}
      aria-describedby={`${ids}-keys`}
      onKeyDown={onKey}
      tabIndex={-1}
    >
      <div className="rec-stage">
        {/* Captions come from the track below (the transcript, timed to this segment). */}
        <video
          ref={video}
          className="rec-video"
          src={seg.url}
          preload="metadata"
          playsInline
          onLoadedMetadata={onLoaded}
          onTimeUpdate={onTimeUpdate}
          onPlay={() => {
            setPlaying(true);
            setFailed(false);
            retried.current = 0;
          }}
          onPause={() => setPlaying(false)}
          onEnded={onEnded}
          onError={() => void onError()}
          onClick={() => void toggle()}
          aria-label={`Recording of ${title}, from ${clock(seg.startMs)}`}
        >
          {vttUrl ? <track kind="captions" srcLang="en" label="Transcript captions" src={vttUrl} default /> : null}
        </video>
        {audioOnly ? (
          <p className="rec-audio-note" aria-hidden="true">
            Audio recording
          </p>
        ) : null}
        {failed ? (
          <div className="rec-stage-msg" role="alert">
            <p>The recording could not be played just now.</p>
            <button
              type="button"
              className="mx-btn is-outline is-sm tap"
              onClick={() => {
                retried.current = 0;
                setFailed(false);
                void onError();
              }}
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>

      <div className="rec-controls">
        <div className="rec-track-wrap">
          <div className="rec-track" aria-hidden="true">
            <span className="rec-track-fill" style={{ width: `${pct(ms)}%` }} />
            {gaps.map((g) => (
              <span
                key={g.startMs}
                className={`rec-track-gap is-${g.kind}`}
                style={{ left: `${pct(g.startMs)}%`, width: `${Math.max(0.6, pct(g.endMs) - pct(g.startMs))}%` }}
              />
            ))}
          </div>
          <input
            type="range"
            className="rec-range"
            min={span.startMs}
            max={span.endMs}
            step={1000}
            value={Math.round(ms)}
            onChange={(e) => seek(Number(e.target.value))}
            onKeyDown={onRangeKey}
            aria-label="Seek"
            aria-valuetext={`${spokenClock(ms)}, of ${spokenClock(span.endMs)}`}
          />
        </div>
        <div className="rec-bar">
          <button
            type="button"
            className="rec-btn is-main tap"
            onClick={() => void toggle()}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={20} weight="fill" aria-hidden="true" /> : <Play size={20} weight="fill" aria-hidden="true" />}
          </button>
          <button type="button" className="rec-btn tap" onClick={() => seek(ms - JUMP_STEP_MS)} aria-label="Back 10 seconds">
            <ArrowArcLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" className="rec-btn tap" onClick={() => seek(ms + JUMP_STEP_MS)} aria-label="Forward 10 seconds">
            <ArrowArcRight size={18} aria-hidden="true" />
          </button>
          <span className="rec-time">
            <span aria-hidden="true">
              {clock(ms)} <span className="rec-time-total">/ {clock(span.endMs)}</span>
            </span>
            <span className="sr-only">
              {spokenClock(ms)} of {spokenClock(span.endMs)}
            </span>
          </span>
          <span className="rec-bar-gap" />
          <label className="rec-speed">
            <span className="sr-only">Playback speed</span>
            <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`rec-btn tap${captions ? " is-on" : ""}`}
            onClick={() => setCaptions((c) => !c)}
            aria-pressed={captions}
            aria-label="Captions"
          >
            <ClosedCaptioning size={20} aria-hidden="true" />
          </button>
          <button type="button" className="rec-btn tap" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"}>
            {fullscreen ? <ArrowsIn size={18} aria-hidden="true" /> : <ArrowsOut size={18} aria-hidden="true" />}
          </button>
        </div>
        {gaps.length > 0 ? (
          <p className="rec-gaps-note">
            {gaps.map((g, i) => (
              <span key={g.startMs}>
                {i > 0 ? "; " : ""}
                {g.kind === "off_record" ? "Off the record" : "Not recorded"} from {clock(g.startMs)} to {clock(g.endMs)}
              </span>
            ))}
            . The player skips {gaps.length === 1 ? "it" : "them"}.
          </p>
        ) : null}
        <p id={`${ids}-keys`} className="sr-only">
          Space or K plays and pauses. Left and Right arrows move 5 seconds, J and L move 10 seconds. C turns captions on or off, F
          goes full screen.
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {notice}
        </p>
      </div>
    </div>
  );
});
