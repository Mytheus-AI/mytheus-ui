// Run: npm test
// Talk mode's state machine: greet, listen (VAD events), transcribe, think, speak, listen again;
// half-duplex, barge-in, pause, mute, errors, and the greeting lines.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  NOT_CAUGHT,
  firstNameOf,
  greetingLines,
  initialVoice,
  levelFrom,
  phaseWords,
  pickGreeting,
  plushFor,
  recording,
  spaceEvent,
  voiceReducer,
  type VoiceEvent,
  type VoiceState,
} from "../src/lib/ask-myte/voice-machine.ts";

const run = (events: VoiceEvent[], from: VoiceState = initialVoice) => events.reduce(voiceReducer, from);

test("a full turn: greet, listen, speech ends, transcribe, think, speak, listen again", () => {
  let s = run([{ type: "start", greet: true }]);
  assert.equal(s.phase, "greeting");
  assert.equal(recording(s), false, "never records while it speaks");
  assert.equal(plushFor(s.phase), "speaking");
  s = voiceReducer(s, { type: "greeted" });
  assert.equal(s.phase, "listening");
  assert.equal(recording(s), true);
  s = voiceReducer(s, { type: "speech-start" });
  assert.equal(s.talking, true);
  s = voiceReducer(s, { type: "speech-end" });
  assert.equal(s.phase, "transcribing");
  assert.equal(s.clip, 1);
  assert.equal(plushFor(s.phase), "thinking");
  assert.equal(phaseWords(s.phase, "Pip"), "Thinking…");
  s = voiceReducer(s, { type: "transcript", text: "  what do I owe  " });
  assert.equal(s.phase, "thinking");
  assert.equal(s.sent, "what do I owe");
  assert.equal(s.turn, 1);
  s = voiceReducer(s, { type: "answer-done", spoken: true });
  assert.equal(s.phase, "speaking");
  assert.equal(recording(s), false);
  s = voiceReducer(s, { type: "spoken" });
  assert.equal(s.phase, "listening");
});

test("speech-end without speech does nothing; a discarded blip keeps listening", () => {
  let s = run([{ type: "start" }, { type: "speech-end" }]);
  assert.equal(s.phase, "listening");
  assert.equal(s.clip, 0);
  s = run([{ type: "speech-start" }, { type: "speech-discard" }], s);
  assert.equal(s.phase, "listening");
  assert.equal(s.talking, false);
  assert.equal(s.clip, 0);
});

test("an empty transcript says it didn't catch that and listens again", () => {
  const s = run([{ type: "start" }, { type: "speech-start" }, { type: "speech-end" }, { type: "transcript", text: " " }]);
  assert.equal(s.phase, "listening");
  assert.equal(s.note, NOT_CAUGHT);
  assert.equal(s.turn, 0);
});

test("transcription failures: passing ones listen again, fatal ones pause with the reason", () => {
  const base = run([{ type: "start" }, { type: "speech-start" }, { type: "send-now" }]);
  assert.equal(base.phase, "transcribing");
  const soft = voiceReducer(base, { type: "transcribe-failed", message: "Wait a few seconds" });
  assert.equal(soft.phase, "listening");
  assert.equal(soft.error, "Wait a few seconds");
  const hard = voiceReducer(base, { type: "transcribe-failed", message: "Listening is unavailable", fatal: true });
  assert.equal(hard.phase, "paused");
  assert.equal(voiceReducer(hard, { type: "resume" }).phase, "listening");
});

test("muted: no greeting and no speaking", () => {
  const s = run([{ type: "mute", muted: true }, { type: "start", greet: true }]);
  assert.equal(s.phase, "listening");
  const after = run([{ type: "speech-start" }, { type: "speech-end" }, { type: "transcript", text: "hi" }, { type: "answer-done", spoken: true }], s);
  assert.equal(after.phase, "listening");
  const speaking = run([{ type: "start", greet: true }, { type: "mute", muted: true }]);
  assert.equal(speaking.phase, "listening");
});

test("barge-in: interrupting the greeting or an answer listens", () => {
  assert.equal(run([{ type: "start", greet: true }, { type: "interrupt" }]).phase, "listening");
  const speaking = run([{ type: "start" }, { type: "speech-start" }, { type: "speech-end" }, { type: "transcript", text: "x" }, { type: "answer-done", spoken: true }]);
  assert.equal(speaking.phase, "speaking");
  assert.equal(voiceReducer(speaking, { type: "interrupt" }).phase, "listening");
});

test("pause and resume keep what was running; mic errors pause", () => {
  let s = run([{ type: "start" }, { type: "speech-start" }, { type: "pause" }]);
  assert.equal(s.phase, "paused");
  assert.equal(s.talking, false, "the half-said utterance is dropped");
  s = voiceReducer(s, { type: "resume" });
  assert.equal(s.phase, "listening");
  s = voiceReducer(s, { type: "mic-error", message: "Microphone blocked" });
  assert.equal(s.phase, "paused");
  assert.equal(s.error, "Microphone blocked");
  assert.equal(voiceReducer(s, { type: "resume" }).error, null);
  const greetPaused = run([{ type: "start", greet: true }, { type: "pause" }, { type: "resume" }]);
  assert.equal(greetPaused.phase, "listening");
  const failed = run([{ type: "start" }, { type: "speech-start" }, { type: "speech-end" }, { type: "transcript", text: "x" }, { type: "answer-failed", message: "Budget" }]);
  assert.equal(failed.phase, "listening");
  assert.equal(failed.error, "Budget");
});

test("end is final until started again", () => {
  let s = run([{ type: "start" }, { type: "end" }, { type: "speech-start" }, { type: "resume" }]);
  assert.equal(s.phase, "ended");
  s = voiceReducer(s, { type: "start" });
  assert.equal(s.phase, "listening");
});

test("Space does the right thing in each phase", () => {
  assert.deepEqual(spaceEvent(initialVoice), { type: "start" });
  const listening = run([{ type: "start" }]);
  assert.deepEqual(spaceEvent(listening), { type: "pause" });
  assert.deepEqual(spaceEvent({ ...listening, talking: true }), { type: "send-now" });
  assert.deepEqual(spaceEvent({ ...listening, phase: "speaking" }), { type: "interrupt" });
  assert.deepEqual(spaceEvent({ ...listening, phase: "greeting" }), { type: "interrupt" });
  assert.deepEqual(spaceEvent({ ...listening, phase: "paused" }), { type: "resume" });
  assert.deepEqual(spaceEvent({ ...listening, phase: "thinking" }), { type: "interrupt" }, "fillers can be interrupted");
  assert.equal(spaceEvent({ ...listening, phase: "transcribing" }), null);
});

test("plush state, words and mic level", () => {
  assert.equal(plushFor("thinking"), "thinking");
  assert.equal(plushFor("paused"), "idle");
  assert.equal(phaseWords("listening", "Pip"), "Pip is listening");
  assert.equal(phaseWords("greeting", "Pip"), "Pip is speaking");
  assert.equal(levelFrom([128, 128, 128]), 0);
  assert.ok(levelFrom([0, 255, 0, 255]) > 0.9);
  assert.equal(levelFrom([]), 0);
});

test("the greeting: its name and the person's first name, four lines, never the same twice", () => {
  assert.equal(firstNameOf("Sushan Adhikari"), "Sushan");
  assert.equal(firstNameOf("sushan@example.com"), "");
  assert.equal(firstNameOf(null), "");
  const lines = greetingLines("Probe", "Sushan");
  assert.equal(lines.length, 4);
  assert.equal(new Set(lines).size, 4);
  for (const l of lines) {
    assert.match(l, /Probe/);
    assert.match(l, /Sushan/);
  }
  assert.equal(pickGreeting("Probe", "Sushan", () => 0), "Hi Sushan, it's Probe. What can I find for you?");
  assert.notEqual(pickGreeting("Probe", "Sushan", () => 0, lines[0]), lines[0]);
  assert.equal(pickGreeting("Probe", "Sushan", () => 0.9999), lines[3]);
  assert.doesNotMatch(pickGreeting("Probe", "", () => 0), /undefined|,\s*,/);
});

test("streaming: the answer's first audio moves thinking to speaking before done; done keeps speaking", () => {
  let s = run([{ type: "start" }, { type: "speech-start" }, { type: "speech-end" }, { type: "transcript", text: "what is next" }]);
  assert.equal(s.phase, "thinking");
  s = voiceReducer(s, { type: "answer-audio" });
  assert.equal(s.phase, "speaking");
  s = voiceReducer(s, { type: "answer-done", spoken: true });
  assert.equal(s.phase, "speaking", "it carries on until everything is said");
  s = voiceReducer(s, { type: "spoken" });
  assert.equal(s.phase, "listening");
  // A failure while it is already speaking listens with the reason.
  s = run([{ type: "speech-start" }, { type: "speech-end" }, { type: "transcript", text: "again" }, { type: "answer-audio" }, { type: "answer-failed", message: "Lost" }], s);
  assert.equal(s.phase, "listening");
  assert.equal(s.error, "Lost");
  // Muted: no audio, so no speaking.
  s = run([{ type: "mute", muted: true }, { type: "speech-start" }, { type: "speech-end" }, { type: "transcript", text: "x" }, { type: "answer-audio" }], s);
  assert.equal(s.phase, "thinking");
});

test("barge-in while it fills the wait: Space while thinking listens", () => {
  const s = run([{ type: "start" }, { type: "speech-start" }, { type: "speech-end" }, { type: "transcript", text: "what is next" }]);
  assert.deepEqual(spaceEvent(s), { type: "interrupt" });
  assert.equal(voiceReducer(s, { type: "interrupt" }).phase, "listening");
});
