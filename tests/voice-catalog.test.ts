// Run: npm test
// The Myte's voice catalogue, the speech route's body check and its error mapping (ADR-0050).
import assert from "node:assert/strict";
import { test } from "node:test";

import { asFailure, checkSpeechBody, failureNote, normalizeCatalog, previewLine, speechFailure } from "../src/lib/voice/catalog.ts";
import { nearestStep, speedName } from "../src/lib/voice/speed.ts";

test("upstream failures map to one {reason} each", () => {
  assert.deepEqual(speechFailure(503, { reason: "voice_not_connected" }), { status: 503, reason: "voice_not_connected" });
  assert.deepEqual(speechFailure(503, null), { status: 503, reason: "voice_not_connected" });
  assert.deepEqual(speechFailure(429, { code: "RATE_LIMITED" }), { status: 429, reason: "rate_limited" });
  assert.deepEqual(speechFailure(401, null), { status: 401, reason: "signed_out" });
  assert.deepEqual(speechFailure(403, null), { status: 401, reason: "signed_out" });
  assert.deepEqual(speechFailure(422, null), { status: 422, reason: "invalid" });
  assert.deepEqual(speechFailure(500, { detail: "boom" }), { status: 502, reason: "voice_failed" });
  assert.deepEqual(speechFailure(502, { reason: "voice_not_connected" }), { status: 503, reason: "voice_not_connected" });
});

test("failure reasons are a closed set, with a quiet note each", () => {
  assert.equal(asFailure("rate_limited"), "rate_limited");
  assert.equal(asFailure("<script>"), "voice_failed");
  assert.equal(asFailure(undefined), "voice_failed");
  assert.equal(failureNote("voice_not_connected"), "Voice is unavailable right now");
  assert.equal(failureNote("voice_failed"), "Voice is unavailable right now");
  assert.match(failureNote("rate_limited"), /this minute/);
  assert.match(failureNote("blocked"), /Press play/);
});

test("the speech body: text 1..1500, a Kokoro voice id, speed clamped, short language", () => {
  assert.deepEqual(checkSpeechBody({ text: "  Hi  " }), { ok: true, body: { text: "Hi", speed: 1, language: "en" } });
  assert.deepEqual(checkSpeechBody({ text: "Hi", voice: "af_heart", speed: 2, language: "en-GB", org_id: "x" }), {
    ok: true,
    body: { text: "Hi", voice: "af_heart", speed: 1.4, language: "en" },
  });
  assert.deepEqual(checkSpeechBody({ text: "Hi", speed: 0.1, voice: null }), { ok: true, body: { text: "Hi", speed: 0.7, language: "en" } });
  assert.equal(checkSpeechBody({ text: "" }).ok, false);
  assert.equal(checkSpeechBody({ text: "x".repeat(1501) }).ok, false);
  assert.equal(checkSpeechBody({ text: "Hi", voice: "../etc" }).ok, false);
  assert.equal(checkSpeechBody({ text: "Hi", voice: "AF_HEART" }).ok, false);
  assert.equal(checkSpeechBody(null).ok, false);
  assert.equal(checkSpeechBody("Hi").ok, false);
});

test("the catalogue drops anything malformed and only keeps choices it offers", () => {
  const c = normalizeCatalog({
    connected: true,
    voices: [
      { id: "af_heart", name: "Heart", description: "Warm and clear", accent: "American", gender: "female" },
      { id: "bm_george", name: "George", description: "Calm", accent: "British", gender: "male" },
      { id: "af_heart", name: "Duplicate" },
      { id: "BAD ID", name: "Nope" },
      null,
      { id: "am_puck", accent: "Martian", gender: "robot" },
    ],
    chosen: "bm_george",
    selected: "zz_unknown",
  });
  assert.equal(c.connected, true);
  assert.deepEqual(
    c.voices.map((v) => [v.id, v.name, v.accent, v.gender]),
    [
      ["af_heart", "Heart", "American", "female"],
      ["bm_george", "George", "British", "male"],
      ["am_puck", "am_puck", "American", "female"],
    ],
  );
  assert.equal(c.chosen, "bm_george");
  assert.equal(c.selected, null);
  assert.deepEqual(normalizeCatalog(undefined), { connected: false, voices: [], chosen: null, selected: null });
});

test("the preview line is in character", () => {
  assert.equal(previewLine("Pip"), "Hi, I'm Pip. I'll keep track of what matters to you.");
  assert.equal(previewLine("  "), "Hi, I'm your Myte. I'll keep track of what matters to you.");
});

test("speed snaps to 0.8..1.2 in tenths", () => {
  assert.equal(nearestStep(1.04), 1);
  assert.equal(nearestStep(3), 1.2);
  assert.equal(nearestStep(0.1), 0.8);
  assert.equal(nearestStep(Number.NaN), 1);
  assert.equal(speedName(1), "Normal");
  assert.equal(speedName(0.8), "Slowest");
});
