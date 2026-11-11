/**
 * Recording playback, the UI's pure rules: the recording's state copy, the meeting timeline
 * (segments and the gaps between them), mapping a moment on the meeting's clock to a segment and
 * back, which transcript line is playing, clip spans and their validation, captions (WebVTT),
 * and the public clip page's read.
 *
 * Pure, type-only imports, so the node test runner can read it (tests/recording.test.ts).
 *
 * The meeting's clock: the transcript's `start_ms` and a segment's `offset_ms` share one origin
 * (the moment the call opened). A recording is one segment per stretch that was recorded; the
 * gaps between segments are the stretches that were off the record (meeting-service stops the
 * egress) or simply not recorded.
 */
import type { components as CoreComponents } from "../../lib/api/generated/core-api.ts";
import type { components as MeetingComponents } from "../../lib/api/generated/meeting-service.ts";

export type RecordingState = MeetingComponents["schemas"]["RecordingState"];
export type RecordingSegment = MeetingComponents["schemas"]["RecordingSegment"];
export type Clip = CoreComponents["schemas"]["Clip"];
export type ClipList = CoreComponents["schemas"]["ClipList"];
export type ClipShareLink = CoreComponents["schemas"]["ClipShareLink"];
export type PublicClipShare = CoreComponents["schemas"]["PublicClipShare"];
export type ClipShare = CoreComponents["schemas"]["ClipShare"];
export type ClipLine = CoreComponents["schemas"]["ClipLine"];

export type Read<T> = { ok: true; data: T } | { ok: false; reason: "none" | "error" };

/** The longest clip (the server's rule; `ClipList.max_duration_ms` repeats it). */
export const MAX_CLIP_MS = 600_000;
/** How often a processing recording is checked again. */
export const RECORDING_POLL_MS = 15_000;
/** Ask for fresh URLs this long before the current ones expire. */
export const URL_REFRESH_MARGIN_MS = 45_000;
export const SEEK_STEP_MS = 5_000;
export const JUMP_STEP_MS = 10_000;
export const SPEEDS = [1, 1.25, 1.5, 2] as const;

/* ------------------------------------------------------------------ time */

/** `0:07`, `12:04`, `1:02:09`. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Spoken form for screen readers: `12 minutes 4 seconds`. */
export function spokenClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m) parts.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
  if (s || parts.length === 0) parts.push(`${s} ${s === 1 ? "second" : "seconds"}`);
  return parts.join(" ");
}

/** "4 min", "45 s", "1 h 5 min": a length in words people scan. */
export function lengthLabel(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${Math.max(1, s)} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Read `m:ss`, `h:mm:ss` or plain seconds typed by a person; null when it is not a time. */
export function parseClock(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 1000);
  const parts = text.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  const [h, m, s] = nums.length === 3 ? nums : [0, nums[0], nums[1]];
  if (s >= 60 || (nums.length === 3 && m >= 60)) return null;
  return ((h * 60 + m) * 60 + s) * 1000;
}

/* ------------------------------------------------------------------ state copy */

export type StateView = {
  /** what the card shows where the player would be */
  kind: "player" | "notice" | "working";
  title: string;
  body: string;
  /** whether to keep checking (processing, recording) */
  poll: boolean;
};

export function stateView(state: RecordingState): StateView {
  const playable = state.segments?.some((s) => s.status === "ready" && !!s.url) ?? false;
  switch (state.status) {
    case "ready":
      return playable
        ? { kind: "player", title: "Recording", body: "", poll: false }
        : {
            kind: "notice",
            title: "The recording could not be opened",
            body: "It is saved, but this page could not get a link to play it. Refresh to try again.",
            poll: false,
          };
    case "processing":
      return {
        kind: "working",
        title: "The recording is being processed",
        body: "It is usually ready a few minutes after the call ends. This page checks again on its own.",
        poll: true,
      };
    case "recording":
      return {
        kind: "working",
        title: "This call is being recorded",
        body: "The recording appears here a few minutes after the call ends.",
        poll: true,
      };
    case "failed":
      return {
        kind: "notice",
        title: "The recording could not be saved",
        body: "Something went wrong while the call was being recorded. The transcript and the minutes are not affected.",
        poll: false,
      };
    case "none":
      if (state.reason === "consent_missing") {
        return {
          kind: "notice",
          title: "No recording, because not everyone agreed",
          body: "This workspace records a call only when everyone in it has agreed to be recorded. The transcript covers what people agreed to.",
          poll: false,
        };
      }
      if (state.reason === "not_started") {
        return { kind: "notice", title: "Nothing recorded yet", body: "The call has not started.", poll: false };
      }
      return {
        kind: "notice",
        title: "This call was not recorded",
        body: "Only the transcript was kept. You can still make clips from it below, and share their words.",
        poll: false,
      };
    case "not_enabled":
    default:
      if (state.reason === "storage_not_configured") {
        return {
          kind: "notice",
          title: "Recording is not connected yet",
          body: "Recording is switched on for this workspace, but storage for recordings is not set up. An admin can finish the setup; the transcript is kept either way.",
          poll: false,
        };
      }
      return {
        kind: "notice",
        title: "Recording is off for this workspace",
        body: "Mytheus keeps the transcript of every call, not its audio and video. You can still make clips from the transcript and share their words.",
        poll: false,
      };
  }
}

/* ------------------------------------------------------------------ the timeline */

export type Span = { startMs: number; endMs: number };

export type PlayableSegment = {
  id: string;
  url: string;
  mediaType: string;
  startMs: number;
  endMs: number;
};

export type Gap = Span & {
  /** `off_record` when an off-the-record stretch covers it, `unrecorded` otherwise */
  kind: "off_record" | "unrecorded";
};

/** Ready segments with a URL and a known place on the clock, in time order. */
export function playableSegments(state: RecordingState): PlayableSegment[] {
  return (state.segments ?? [])
    .filter((s) => s.status === "ready" && !!s.url && s.offset_ms != null && s.duration_ms != null)
    .map((s) => ({
      id: s.id,
      url: s.url as string,
      mediaType: s.media_type,
      startMs: s.offset_ms as number,
      endMs: (s.offset_ms as number) + (s.duration_ms as number),
    }))
    .sort((a, b) => a.startMs - b.startMs);
}

export type OffRecordSpan = { startMs: number | null; endMs: number | null; durationMs: number | null };

/** Off-the-record stretches with a known place; an open one runs to `untilMs`. */
export function offRecordSpans(raw: OffRecordSpan[], untilMs: number): Span[] {
  return raw
    .filter((g) => g.startMs != null)
    .map((g) => {
      const start = g.startMs as number;
      const end = g.endMs ?? (g.durationMs != null ? start + g.durationMs : untilMs);
      return { startMs: start, endMs: Math.max(start, end) };
    })
    .sort((a, b) => a.startMs - b.startMs);
}

function overlaps(a: Span, b: Span): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/** The gaps between playable segments, named off the record when one covers them. */
export function timelineGaps(segments: PlayableSegment[], offRecord: Span[]): Gap[] {
  const gaps: Gap[] = [];
  for (let i = 1; i < segments.length; i += 1) {
    const span = { startMs: segments[i - 1].endMs, endMs: segments[i].startMs };
    if (span.endMs - span.startMs < 1000) continue;
    gaps.push({ ...span, kind: offRecord.some((o) => overlaps(o, span)) ? "off_record" : "unrecorded" });
  }
  return gaps;
}

/** Where a moment on the meeting's clock plays: the segment and the time inside it, or, inside a
 *  gap, the start of the next segment (`skipped` says it moved). */
export function locate(
  segments: PlayableSegment[],
  ms: number,
): { index: number; localMs: number; skipped: boolean } | null {
  if (segments.length === 0) return null;
  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i];
    if (ms < s.startMs) return { index: i, localMs: 0, skipped: i > 0 || ms < s.startMs - 1000 };
    if (ms <= s.endMs) return { index: i, localMs: ms - s.startMs, skipped: false };
  }
  const last = segments.length - 1;
  return { index: last, localMs: segments[last].endMs - segments[last].startMs, skipped: true };
}

/** The meeting-clock span the player covers. */
export function timelineSpan(segments: PlayableSegment[]): Span {
  if (segments.length === 0) return { startMs: 0, endMs: 0 };
  return { startMs: segments[0].startMs, endMs: segments[segments.length - 1].endMs };
}

/* ------------------------------------------------------------------ the transcript */

export type Line = {
  id: string;
  speakerId: string;
  speaker: string;
  startMs: number;
  endMs: number;
  text: string;
};

/** The line playing at `ms`: the last line that started at or before it (binary search), or -1
 *  before the first line. A line stays current through the pause after it. */
export function currentLineIndex(lines: Line[], ms: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].startMs <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export type TranscriptItem = { kind: "line"; line: Line; index: number } | { kind: "gap"; gap: Span; key: string };

/** Lines in order with the off-the-record stretches placed between them. */
export function transcriptItems(lines: Line[], offRecord: Span[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  let g = 0;
  lines.forEach((line, index) => {
    while (g < offRecord.length && offRecord[g].startMs <= line.startMs) {
      items.push({ kind: "gap", gap: offRecord[g], key: `gap-${offRecord[g].startMs}` });
      g += 1;
    }
    items.push({ kind: "line", line, index });
  });
  for (; g < offRecord.length; g += 1) items.push({ kind: "gap", gap: offRecord[g], key: `gap-${offRecord[g].startMs}` });
  return items;
}

/* ------------------------------------------------------------------ clips */

export type ClipProblem = "order" | "too_long" | "off_record" | null;

export const CLIP_PROBLEM_COPY: Record<Exclude<ClipProblem, null>, string> = {
  order: "The end must come after the start.",
  too_long: "A clip can be at most 10 minutes long.",
  off_record: "A clip cannot include a part of the meeting that was off the record.",
};

export function clipProblem(span: Span, offRecord: Span[]): ClipProblem {
  if (span.endMs <= span.startMs) return "order";
  if (span.endMs - span.startMs > MAX_CLIP_MS) return "too_long";
  if (offRecord.some((o) => overlaps(o, span))) return "off_record";
  return null;
}

/** The span of a run of selected lines, from the earliest start to the latest end. */
export function spanOfLines(lines: Line[], a: number, b: number): Span | null {
  if (a < 0 || b < 0 || a >= lines.length || b >= lines.length) return null;
  const [from, to] = a <= b ? [a, b] : [b, a];
  return { startMs: lines[from].startMs, endMs: Math.max(lines[to].endMs, lines[from].startMs + 1000) };
}

/** A title suggested from the first selected line: its first words, trimmed. */
export function suggestTitle(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").slice(0, 8).join(" ");
  const clean = words.replace(/[.,;:!?]+$/, "");
  return clean.length > 80 ? `${clean.slice(0, 79)}…` : clean;
}

/** Whether a clip can carry video on its share page: it sits inside one recorded segment. */
export function clipHasVideo(segments: PlayableSegment[], span: Span): boolean {
  return segments.some((s) => s.startMs <= span.startMs && span.endMs <= s.endMs);
}

/** A clip link's failure, from the server's answer. */
export type ClipFailure = "confirm" | "host_only" | "not_configured" | "off_record" | "not_participant" | "error";

export function clipFailure(status: number, reason: string | null, code: string | null): ClipFailure {
  if (status === 409 && reason === "confidential_confirmation_required") return "confirm";
  if (status === 409 && reason === "off_record_overlap") return "off_record";
  if (status === 403 && reason === "confidential_host_only") return "host_only";
  if (status === 403 && code === "NOT_A_PARTICIPANT") return "not_participant";
  if (status === 503) return "not_configured";
  return "error";
}

export const CLIP_FAILURE_COPY: Record<Exclude<ClipFailure, "confirm">, string> = {
  host_only: "This meeting is confidential, so only its host can share clips from it.",
  not_configured: "Share links are not set up on this server yet. An admin needs to configure them.",
  off_record: "That span includes a part of the meeting that was off the record.",
  not_participant: "Only people who were in the meeting can make and share its clips.",
  error: "That did not work. Try again in a moment.",
};

/* ------------------------------------------------------------------ captions */

function vttTime(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const milli = total % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
}

function vttText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/-->/g, "→");
}

/** WebVTT captions for one segment: lines inside it, timed from the segment's start, with the
 *  speaker as a voice tag (`<v Maya Patel>`), so screen readers and captions name who spoke. */
export function captionsVtt(lines: Line[], segment: Span): string {
  const cues: string[] = [];
  for (const line of lines) {
    if (line.endMs <= segment.startMs || line.startMs >= segment.endMs) continue;
    const start = Math.max(0, line.startMs - segment.startMs);
    const end = Math.max(start + 500, Math.min(line.endMs, segment.endMs) - segment.startMs);
    const voice = line.speaker.replace(/[<>]/g, "");
    cues.push(`${vttTime(start)} --> ${vttTime(end)}\n<v ${voice}>${vttText(line.text)}`);
  }
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

/* ------------------------------------------------------------------ the public clip page */

export type PublicClipRead =
  | { kind: "ok"; share: PublicClipShare }
  | { kind: "gone"; reason: "expired" | "revoked" }
  | { kind: "not_found" }
  | { kind: "error" };

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Whether the generic share read answered "this token is a clip; read the clip route". */
export function isClipShareRedirect(status: number, body: unknown): boolean {
  return status === 404 && obj(body)?.reason === "clip_share";
}

export function publicClipRead(status: number, body: unknown): PublicClipRead {
  if (status === 200) {
    const o = obj(body);
    const clip = obj(o?.clip);
    if (o && clip && Array.isArray(clip.lines) && obj(clip.video)) return { kind: "ok", share: o as PublicClipShare };
    return { kind: "error" };
  }
  if (status === 410) return { kind: "gone", reason: obj(body)?.reason === "revoked" ? "revoked" : "expired" };
  if (status === 404 || status === 422) return { kind: "not_found" };
  return { kind: "error" };
}

/** The clip page's lines as player lines (times relative to the clip). */
export function clipLines(clip: ClipShare): Line[] {
  return clip.lines.map((l, i) => ({
    id: `l${i}`,
    speakerId: l.speaker_name ?? "",
    speaker: l.speaker_name ?? "Someone",
    startMs: l.offset_ms,
    endMs: l.end_offset_ms,
    text: l.text,
  }));
}

export function clipVideoCopy(video: ClipShare["video"]): string | null {
  switch (video.status) {
    case "ready":
      return null;
    case "rendering":
      return "The video for this clip is being prepared. Refresh in a minute to watch it.";
    case "unavailable":
      return "The video for this clip is not available, so this page shows what was said.";
    case "not_included":
    default:
      return null;
  }
}
