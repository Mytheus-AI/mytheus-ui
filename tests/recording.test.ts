// Run: npm test
// Recording playback, the UI's pure rules: time, the state copy, the timeline and its gaps,
// mapping the meeting clock to a segment, the playing line, clip validation, captions and the
// public clip read.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_CLIP_MS,
  captionsVtt,
  clipFailure,
  clipHasVideo,
  clipLines,
  clipProblem,
  clock,
  currentLineIndex,
  isClipShareRedirect,
  lengthLabel,
  locate,
  offRecordSpans,
  parseClock,
  playableSegments,
  publicClipRead,
  spanOfLines,
  spokenClock,
  stateView,
  suggestTitle,
  timelineGaps,
  timelineSpan,
  transcriptItems,
  type Line,
  type RecordingState,
} from "../src/components/recording/recording-model.ts";

const seg = (id: string, offset: number, duration: number, status = "ready") => ({
  id,
  status: status as "ready",
  media_type: "video/mp4" as const,
  offset_ms: offset,
  duration_ms: duration,
  started_at: "2026-11-10T15:00:00Z",
  ended_at: null,
  url: status === "ready" ? `https://r.test/${id}` : null,
});

const state = (over: Partial<RecordingState>): RecordingState => ({
  meeting_id: "m",
  status: "ready",
  duration_ms: 0,
  segments: [],
  ...over,
});

const lines: Line[] = [
  { id: "a", speakerId: "u1", speaker: "Maya Patel", startMs: 1000, endMs: 4000, text: "We should raise the price." },
  { id: "b", speakerId: "u2", speaker: "Raj", startMs: 5000, endMs: 9000, text: "Forty dollars works <for me>." },
  { id: "c", speakerId: "u1", speaker: "Maya Patel", startMs: 400_000, endMs: 402_000, text: "Back on the record." },
];

test("clock, spoken clock, lengths and parsing", () => {
  assert.equal(clock(7_000), "0:07");
  assert.equal(clock(724_000), "12:04");
  assert.equal(clock(3_729_000), "1:02:09");
  assert.equal(spokenClock(724_000), "12 minutes 4 seconds");
  assert.equal(spokenClock(0), "0 seconds");
  assert.equal(lengthLabel(45_000), "45 s");
  assert.equal(lengthLabel(240_000), "4 min");
  assert.equal(lengthLabel(3_900_000), "1 h 5 min");
  assert.equal(parseClock("12:04"), 724_000);
  assert.equal(parseClock("1:02:09"), 3_729_000);
  assert.equal(parseClock("90"), 90_000);
  assert.equal(parseClock("1:75"), null);
  assert.equal(parseClock("abc"), null);
});

test("every recording state has calm copy, and only ready plays", () => {
  assert.equal(stateView(state({ status: "not_enabled" })).title, "Recording is off for this workspace");
  assert.equal(stateView(state({ status: "not_enabled", reason: "storage_not_configured" })).title, "Recording is not connected yet");
  assert.equal(stateView(state({ status: "none", reason: "consent_missing" })).title, "No recording, because not everyone agreed");
  const processing = stateView(state({ status: "processing" }));
  assert.equal(processing.kind, "working");
  assert.equal(processing.poll, true);
  assert.equal(stateView(state({ status: "failed" })).title, "The recording could not be saved");
  assert.equal(stateView(state({ segments: [seg("s1", 0, 1000)] })).kind, "player");
  assert.equal(stateView(state({ segments: [seg("s1", 0, 1000, "failed")] })).kind, "notice");
});

test("segments, gaps named off the record, and locating a moment", () => {
  const st = state({ segments: [seg("b", 300_000, 200_000), seg("a", 0, 120_000), seg("x", 0, 10, "failed")] });
  const playable = playableSegments(st);
  assert.deepEqual(playable.map((s) => s.id), ["a", "b"]);
  assert.deepEqual(timelineSpan(playable), { startMs: 0, endMs: 500_000 });
  const off = offRecordSpans([{ startMs: 130_000, endMs: 290_000, durationMs: 160_000 }, { startMs: null, endMs: null, durationMs: null }], 600_000);
  assert.deepEqual(timelineGaps(playable, off), [{ startMs: 120_000, endMs: 300_000, kind: "off_record" }]);
  assert.deepEqual(timelineGaps(playable, []), [{ startMs: 120_000, endMs: 300_000, kind: "unrecorded" }]);
  assert.deepEqual(locate(playable, 60_000), { index: 0, localMs: 60_000, skipped: false });
  assert.deepEqual(locate(playable, 200_000), { index: 1, localMs: 0, skipped: true });
  assert.deepEqual(locate(playable, 350_000), { index: 1, localMs: 50_000, skipped: false });
  assert.equal(locate([], 5), null);
  // An open segment runs to the end.
  assert.deepEqual(offRecordSpans([{ startMs: 10, endMs: null, durationMs: null }], 99), [{ startMs: 10, endMs: 99 }]);
});

test("the playing line and the transcript with its gaps", () => {
  assert.equal(currentLineIndex(lines, 500), -1);
  assert.equal(currentLineIndex(lines, 4500), 0);
  assert.equal(currentLineIndex(lines, 5000), 1);
  assert.equal(currentLineIndex(lines, 999_999), 2);
  const items = transcriptItems(lines, [{ startMs: 130_000, endMs: 290_000 }]);
  assert.deepEqual(items.map((i) => i.kind), ["line", "line", "gap", "line"]);
});

test("clip spans: order, length, off the record, video", () => {
  const off = [{ startMs: 130_000, endMs: 290_000 }];
  assert.equal(clipProblem({ startMs: 5, endMs: 5 }, off), "order");
  assert.equal(clipProblem({ startMs: 0, endMs: MAX_CLIP_MS + 1 }, []), "too_long");
  assert.equal(clipProblem({ startMs: 100_000, endMs: 140_000 }, off), "off_record");
  assert.equal(clipProblem({ startMs: 0, endMs: 120_000 }, off), null);
  assert.deepEqual(spanOfLines(lines, 1, 0), { startMs: 1000, endMs: 9000 });
  assert.equal(spanOfLines(lines, 0, 9), null);
  const playable = playableSegments(state({ segments: [seg("a", 0, 120_000)] }));
  assert.equal(clipHasVideo(playable, { startMs: 1000, endMs: 9000 }), true);
  assert.equal(clipHasVideo(playable, { startMs: 100_000, endMs: 200_000 }), false);
  assert.equal(suggestTitle("We should raise the price to forty dollars next quarter, says Maya."), "We should raise the price to forty dollars");
  assert.equal(clipFailure(409, "confidential_confirmation_required", null), "confirm");
  assert.equal(clipFailure(409, "off_record_overlap", null), "off_record");
  assert.equal(clipFailure(403, "confidential_host_only", null), "host_only");
  assert.equal(clipFailure(503, null, null), "not_configured");
});

test("captions name the speaker and escape markup", () => {
  const vtt = captionsVtt(lines, { startMs: 0, endMs: 120_000 });
  assert.ok(vtt.startsWith("WEBVTT\n\n"));
  assert.ok(vtt.includes("00:00:01.000 --> 00:00:04.000\n<v Maya Patel>We should raise the price."));
  assert.ok(vtt.includes("Forty dollars works &lt;for me&gt;."));
  assert.ok(!vtt.includes("Back on the record."));
  const later = captionsVtt(lines, { startMs: 300_000, endMs: 500_000 });
  assert.ok(later.includes("00:01:40.000 --> 00:01:42.000"));
});

test("the public clip read", () => {
  assert.equal(isClipShareRedirect(404, { reason: "clip_share" }), true);
  assert.equal(isClipShareRedirect(404, { reason: "x" }), false);
  const body = {
    shared_by_name: "Maya Patel",
    shared_at: "2026-11-10T10:00:00Z",
    expires_at: "2026-12-10T10:00:00Z",
    view_count: 1,
    clip: {
      clip_id: "c",
      title: "Pricing",
      meeting_title: "Pricing review",
      start_ms: 10_000,
      end_ms: 40_000,
      duration_ms: 30_000,
      lines: [{ speaker_name: null, offset_ms: 0, end_offset_ms: 2000, text: "Hi" }],
      video: { status: "not_included" },
    },
  };
  const read = publicClipRead(200, body);
  assert.equal(read.kind, "ok");
  if (read.kind === "ok") assert.deepEqual(clipLines(read.share.clip)[0].speaker, "Someone");
  assert.deepEqual(publicClipRead(410, { reason: "revoked" }), { kind: "gone", reason: "revoked" });
  assert.deepEqual(publicClipRead(404, {}), { kind: "not_found" });
  assert.deepEqual(publicClipRead(200, { clip: {} }), { kind: "error" });
  assert.deepEqual(publicClipRead(500, null), { kind: "error" });
});
