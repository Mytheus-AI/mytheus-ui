// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { initialVoice, levelFrom, phaseWords, plushFor, SILENCE_MS, spaceEvent, voiceReducer, type VoiceEvent, type VoiceState } from "../src/lib/ask-myte/voice-machine.ts";

const run = (events: VoiceEvent[], from: VoiceState = initialVoice) => events.reduce(voiceReducer, from);

test("a full turn: listen, a pause sends, think, speak, listen again", () => {
  let s = run([{ type: "start" }, { type: "heard", text: "what do I owe", at: 1000 }]);
  assert.equal(s.phase, "listening");
  s = voiceReducer(s, { type: "tick", at: 1000 + SILENCE_MS - 1 });
  assert.equal(s.phase, "listening");
  s = voiceReducer(s, { type: "tick", at: 1000 + SILENCE_MS });
  assert.equal(s.phase, "thinking");
  assert.equal(s.sent, "what do I owe");
  assert.equal(s.turn, 1);
  assert.equal(s.heard, "");
  s = voiceReducer(s, { type: "answer-done", spoken: true });
  assert.equal(s.phase, "speaking");
  s = voiceReducer(s, { type: "spoken" });
  assert.equal(s.phase, "listening");
});

test("silence without words never sends", () => {
  const s = run([{ type: "start" }, { type: "tick", at: 99_999 }]);
  assert.equal(s.phase, "listening");
  assert.equal(s.turn, 0);
});

test("muted: no speaking, straight back to listening", () => {
  const s = run([{ type: "mute", muted: true }, { type: "start" }, { type: "heard", text: "hi", at: 1 }, { type: "send-now" }, { type: "answer-done", spoken: true }]);
  assert.equal(s.phase, "listening");
  assert.equal(s.muted, true);
  const speaking = run([{ type: "start" }, { type: "heard", text: "hi", at: 1 }, { type: "send-now" }, { type: "answer-done", spoken: true }, { type: "mute", muted: true }]);
  assert.equal(speaking.phase, "listening");
});

test("pause and resume keep what was running; errors pause", () => {
  let s = run([{ type: "start" }, { type: "heard", text: "half a", at: 1 }, { type: "pause" }]);
  assert.equal(s.phase, "paused");
  s = voiceReducer(s, { type: "resume" });
  assert.equal(s.phase, "listening");
  assert.equal(s.heard, "half a");
  s = voiceReducer(s, { type: "mic-error", message: "Microphone blocked" });
  assert.equal(s.phase, "paused");
  assert.equal(s.error, "Microphone blocked");
  const failed = run([{ type: "start" }, { type: "heard", text: "x", at: 1 }, { type: "send-now" }, { type: "answer-failed", message: "Budget" }]);
  assert.equal(failed.phase, "listening");
  assert.equal(failed.error, "Budget");
});

test("end is final until started again", () => {
  let s = run([{ type: "start" }, { type: "end" }, { type: "heard", text: "x", at: 1 }, { type: "resume" }]);
  assert.equal(s.phase, "ended");
  s = voiceReducer(s, { type: "start" });
  assert.equal(s.phase, "listening");
});

test("Space does the right thing in each phase", () => {
  assert.deepEqual(spaceEvent(initialVoice), { type: "start" });
  const listening = run([{ type: "start" }]);
  assert.deepEqual(spaceEvent(listening), { type: "pause" });
  assert.deepEqual(spaceEvent({ ...listening, heard: "hi" }), { type: "send-now" });
  assert.deepEqual(spaceEvent({ ...listening, phase: "speaking" }), { type: "interrupt" });
  assert.deepEqual(spaceEvent({ ...listening, phase: "paused" }), { type: "resume" });
  assert.equal(spaceEvent({ ...listening, phase: "thinking" }), null);
});

test("plush state, words and mic level", () => {
  assert.equal(plushFor("thinking"), "thinking");
  assert.equal(plushFor("paused"), "idle");
  assert.equal(phaseWords("listening", "Pip"), "Pip is listening");
  assert.equal(levelFrom([128, 128, 128]), 0);
  assert.ok(levelFrom([0, 255, 0, 255]) > 0.9);
  assert.equal(levelFrom([]), 0);
});
