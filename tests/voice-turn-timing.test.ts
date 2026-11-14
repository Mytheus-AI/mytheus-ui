// Run: npm test
// Talk mode's per-turn latency telemetry: marks from the end of speech, kept once, formatted.
import assert from "node:assert/strict";
import { test } from "node:test";

import { createTurnTiming, formatMs, formatSummary, wantsVoiceDebug } from "../src/lib/voice/turn-timing.ts";

test("marks are measured from the end of speech and kept the first time", () => {
  const t = createTurnTiming(3, 10_000);
  t.mark("filler", 11_040);
  t.mark("stt", 11_000);
  t.mark("step", 11_900);
  t.mark("step", 12_500);
  t.mark("text", 12_400);
  t.mark("audio", 13_350);
  assert.equal(t.has("done"), false);
  assert.deepEqual(t.summary(), { turn: 3, stt: 1000, step: 1900, text: 2400, audio: 3350, done: null, filler: 1040 });
  t.mark("done", 16_100.4);
  assert.equal(t.summary().done, 6100);
});

test("the one-line summary", () => {
  const t = createTurnTiming(1, 0);
  t.mark("stt", 980);
  t.mark("text", 2300);
  assert.equal(formatSummary(t.summary()), "[talk] turn 1 from end of speech: stt 980 ms, step -, text 2.30 s, audio -, done -, filler -");
  assert.equal(formatMs(null), "-");
  assert.equal(formatMs(999), "999 ms");
});

test("the overlay is asked for with ?voice-debug=1", () => {
  assert.equal(wantsVoiceDebug("?voice-debug=1"), true);
  assert.equal(wantsVoiceDebug("?a=b&voice-debug=1"), true);
  assert.equal(wantsVoiceDebug("?voice-debug=0"), false);
  assert.equal(wantsVoiceDebug(""), false);
});
