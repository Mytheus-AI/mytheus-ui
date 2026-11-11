// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LATE_LIMITS,
  agreementHeadline,
  agreementSegments,
  checkLateDraft,
  inMeetingLine,
  lateLabel,
  meetingClock,
  momentHref,
  nudgePrompt,
  parseSignalEvent,
  pickAudioMime,
  promptFor,
  replaySpan,
  resumeHeadline,
  sendableMime,
  showResumePin,
  strengthChip,
  strengthSentence,
} from "../src/lib/room-signals.ts";
import { describeNotification, type FeedRowInput } from "../src/components/notifications/alert-copy.ts";
import type { AgreementSummary, ResumePoint } from "../src/lib/api/room-signals-types.ts";

const N = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const M = "99999999-8888-4777-8666-555555555555";

const row = (over: Partial<FeedRowInput>): FeedRowInput => ({
  id: "n1",
  meeting_id: null,
  source: "notification",
  alert_type: null,
  priority: 3,
  title: "",
  body: "",
  link: null,
  payload: null,
  status: "unread",
  created_at: "2026-11-11T09:00:00Z",
  ...over,
});

/* ------------------------------------------------------------------ notifications */

test("room-signals source ids parse, and nothing else does", () => {
  assert.deepEqual(parseSignalEvent(`lastword:${N}`), { kind: "lastword", nudgeId: N });
  assert.deepEqual(parseSignalEvent(`agreement:${N.toUpperCase()}`), { kind: "agreement", checkId: N });
  assert.deepEqual(parseSignalEvent(`latecontribution:${N}`), { kind: "latecontribution", contributionId: N });
  assert.equal(parseSignalEvent(`lastword:nope`), null);
  assert.equal(parseSignalEvent(`lastword:${N}:extra`), null);
  assert.equal(parseSignalEvent(`decision-reversal:${N}`), null);
  assert.equal(parseSignalEvent(42), null);
});

test("a last-word nudge informs, blue, and opens the meeting's last-word card", () => {
  const n = describeNotification(
    row({ meeting_id: M, title: "You started to say something about pricing. Want to add it?", payload: { source_event_id: `lastword:${N}` } }),
  );
  assert.equal(n.kind, "last_word");
  assert.equal(n.priority, 3);
  assert.equal(n.meetingId, M);
  assert.equal(n.href, `/meetings/${M}#last-word`);
  assert.match(n.title, /pricing/);
});

test("an agreement check is amber and never links back to the Inbox it sits in", () => {
  const n = describeNotification(row({ link: "/inbox", priority: 3, payload: { source_event_id: `agreement:${N}` } }));
  assert.equal(n.kind, "agreement_check");
  assert.equal(n.priority, 2);
  assert.equal(n.href, null);
  assert.ok(n.title.length > 0);
});

test("a late contribution tells the host and opens the late section", () => {
  const n = describeNotification(row({ meeting_id: M, payload: { source_event_id: `latecontribution:${N}` } }));
  assert.equal(n.kind, "late_contribution");
  assert.equal(n.href, `/meetings/${M}#late`);
  // A foreign link is dropped, never followed.
  assert.equal(describeNotification(row({ meeting_id: M, link: "https://evil.example", payload: { source_event_id: `latecontribution:${N}` } })).href, `/meetings/${M}#late`);
});

/* ------------------------------------------------------------------ the last word */

test("the moment link opens the transcript at that second", () => {
  assert.equal(momentHref(M, 125_900), `/meetings/${M}/transcript#t=125`);
  assert.equal(momentHref(M, null), `/meetings/${M}/transcript`);
  assert.equal(meetingClock(725_000), "12:05");
  assert.equal(meetingClock(3_725_000), "1:02:05");
});

test("the nudge's question per kind, the server's own wins", () => {
  assert.equal(promptFor("cut_off", "pricing"), "You started to say something about pricing. Want to add it?");
  assert.equal(promptFor("spoken_over", "pricing"), "You started to say something about pricing. Want to add it?");
  assert.match(promptFor("hand_not_called", "pricing"), /^Your hand was up while the room discussed pricing/);
  assert.equal(promptFor("topic_silent", "pricing"), "Pricing came up and you listen for it. Want to add your view?");
  assert.equal(nudgePrompt({ prompt: "  Server says  ", kind: "cut_off", topic: "x" }), "Server says");
  assert.equal(nudgePrompt({ prompt: "", kind: "cut_off", topic: "" }), "You started to say something about the discussion. Want to add it?");
});

test("a late contribution needs words or a recording, within limits", () => {
  assert.deepEqual(checkLateDraft({ body: "  We should test in EU first ", audio: null }), { ok: true, body: "We should test in EU first" });
  assert.equal(checkLateDraft({ body: "   ", audio: null }).ok, false);
  const long = checkLateDraft({ body: "x".repeat(LATE_LIMITS.bodyMax + 1), audio: null });
  assert.equal(long.ok, false);
  assert.deepEqual(checkLateDraft({ body: "", audio: { bytes: 1000, durationMs: 9000, mime: "audio/webm;codecs=opus" } }), { ok: true, body: null });
  assert.equal(checkLateDraft({ body: "", audio: { bytes: LATE_LIMITS.audioMaxBytes + 1, durationMs: 9000, mime: "audio/webm" } }).ok, false);
  assert.equal(checkLateDraft({ body: "", audio: { bytes: 10, durationMs: 200_000, mime: "audio/webm" } }).ok, false);
  assert.equal(checkLateDraft({ body: "", audio: { bytes: 10, durationMs: 1000, mime: "audio/wav" } }).ok, false);
});

test("the recorder picks a format the server takes", () => {
  assert.deepEqual(pickAudioMime((m) => m.startsWith("audio/webm")), { record: "audio/webm;codecs=opus", send: "audio/webm" });
  assert.deepEqual(pickAudioMime((m) => m === "audio/mp4"), { record: "audio/mp4", send: "audio/mp4" });
  assert.equal(pickAudioMime(() => false), null);
  assert.equal(pickAudioMime(() => {
    throw new Error("no");
  }), null);
  assert.equal(sendableMime("audio/ogg; codecs=opus"), "audio/ogg");
  assert.equal(sendableMime("video/webm"), null);
});

test("late labels", () => {
  assert.equal(lateLabel(1), "1 late contribution");
  assert.equal(lateLabel(3), "3 late contributions");
});

/* ------------------------------------------------------------------ the agreement check */

const summary = (over: Partial<AgreementSummary> = {}): AgreementSummary => ({
  participants: 5,
  support: 3,
  concerns: 1,
  object: 0,
  pending: 1,
  in_meeting: { yes: 2, hedged: 2, silent: 1, objected: 0, talked_over: 0 },
  ...over,
});

test("only weak and mixed agreement are flagged on a decision", () => {
  assert.equal(strengthChip("weak")?.label, "Weak agreement");
  assert.equal(strengthChip("weak")?.tone, "medium");
  assert.equal(strengthChip("mixed")?.label, "Mixed agreement");
  assert.equal(strengthChip("strong"), null);
  assert.equal(strengthChip("unclear"), null);
  assert.equal(strengthChip(null), null);
  assert.match(strengthSentence(null), /not ready/);
});

test("the owner's headline: how many actually support it", () => {
  assert.equal(agreementHeadline(summary()), "3 of 5 actually support this");
  assert.equal(agreementHeadline(summary({ participants: 1, support: 1, concerns: 0, pending: 0 })), "1 of 1 actually supports this");
  assert.equal(agreementHeadline(summary({ participants: 0, support: 0, concerns: 0, pending: 0 })), "Nobody has weighed in yet");
});

test("the stacked bar adds up to 100 and leaves empty parts at 0", () => {
  const segs = agreementSegments(summary({ support: 1, concerns: 1, object: 1, pending: 0 }));
  assert.equal(segs.reduce((a, s) => a + s.pct, 0), 100);
  assert.equal(segs.find((s) => s.key === "pending")?.pct, 0);
  assert.deepEqual(
    agreementSegments(summary({ support: 0, concerns: 0, object: 0, pending: 0 })).map((s) => s.pct),
    [0, 0, 0, 0],
  );
});

test("the in-meeting read is counts only, never names", () => {
  assert.equal(inMeetingLine(summary()), "In the meeting: 2 clearly said yes, 2 hedged, 1 stayed quiet.");
  assert.equal(
    inMeetingLine(summary({ in_meeting: { yes: 0, hedged: 0, silent: 0, objected: 1, talked_over: 2 } })),
    "In the meeting: 1 objected, 2 were talked over.",
  );
});

/* ------------------------------------------------------------------ pick up where we stopped */

const point = (over: Partial<ResumePoint> = {}): ResumePoint => ({
  id: N,
  meeting_id: M,
  meeting_title: "Platform sync",
  meeting_ended_at: "2026-11-10T10:00:00Z",
  reason: "cut_off",
  topic: "the migration risk",
  headline: "",
  positions: [
    { user_id: "a", name: "Maya", quote: "We move in January.", start_ms: 100_000, end_ms: 104_000 },
    { user_id: "b", name: "Diego", quote: "Not before the audit.", start_ms: 110_000, end_ms: 113_000 },
  ],
  cut_off: { user_id: "c", name: "Raj", quote: "The risk is that the old", start_ms: 120_000, end_ms: 122_500 },
  agenda_item_id: null,
  status: "open",
  continued_in_meeting_id: null,
  created_at: "2026-11-10T10:01:00Z",
  ...over,
});

test("the pin's headline, from the server or built the same way", () => {
  assert.equal(resumeHeadline(point({ headline: "Raj was halfway through it" })), "Raj was halfway through it");
  assert.equal(resumeHeadline(point()), "Raj was halfway through explaining the migration risk");
  assert.equal(resumeHeadline(point({ reason: "time_ran_out", cut_off: null })), "Time ran out on the migration risk");
  assert.equal(resumeHeadline(point({ reason: "agenda_unfinished", cut_off: null })), "The migration risk was left unfinished");
});

test("replay covers the cut-off words, else both positions", () => {
  assert.deepEqual(replaySpan(point()), { startMs: 120_000, endMs: 122_500 });
  assert.deepEqual(replaySpan(point({ cut_off: null })), { startMs: 100_000, endMs: 113_000 });
  assert.equal(replaySpan(point({ cut_off: null, positions: [] })), null);
});

test("the pin shows only an open point not hidden here", () => {
  assert.equal(showResumePin(point(), new Set()), true);
  assert.equal(showResumePin(point({ status: "continued" }), new Set()), false);
  assert.equal(showResumePin(point(), new Set([N])), false);
  assert.equal(showResumePin(null, new Set()), false);
});
