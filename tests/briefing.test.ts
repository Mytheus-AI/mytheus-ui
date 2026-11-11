// Run: npm test
// A briefing from your agent: where "open the moment" goes, which device voice speaks it, the
// persona's pace, where the playhead is, and the copy for each state.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LENGTHS,
  SPEEDS,
  agentSeed,
  clock,
  coverLine,
  isWriting,
  momentHref,
  momentLabel,
  nearestSpeed,
  pickVoice,
  segmentAt,
  segmentSeconds,
  segmentStarts,
  speedLabel,
  unavailableCopy,
  voiceTone,
  voicesFor,
  wordAt,
  type BriefingLink,
} from "../src/lib/briefing.ts";

const M = "11111111-2222-3333-4444-555555555555";

test("open the moment goes to the transcript at the moment, else to the record", () => {
  const at: BriefingLink = { type: "decision", meeting_id: M, id: "d1", at_ms: 61500.4 };
  assert.equal(momentHref(at), `/meetings/${M}/transcript#t=61500`);
  assert.equal(momentLabel(at), "Open the moment");
  assert.equal(momentHref({ type: "decision", meeting_id: M, id: "d1", at_ms: null }), "/decisions/d1");
  assert.equal(momentLabel({ type: "decision", meeting_id: M, id: "d1", at_ms: null }), "Open the decision");
  assert.equal(momentHref({ type: "action", meeting_id: M, id: "a1", at_ms: null }), "/work/tasks");
  assert.equal(momentHref({ type: "promise", meeting_id: M, id: "p1", at_ms: null }), "/work/promises");
  assert.equal(momentHref({ type: "question", meeting_id: M, id: null, at_ms: null }), `/meetings/${M}`);
  assert.equal(momentLabel({ type: "question", meeting_id: M, id: null, at_ms: null }), "Open the meeting");
  assert.equal(momentHref(null), null);
  assert.equal(momentLabel(undefined), "");
});

const VOICES = [
  { name: "Albert", lang: "en-US" },
  { name: "Samantha", lang: "en-US" },
  { name: "Google UK English Female", lang: "en-GB" },
  { name: "Microsoft Aria Online (Natural)", lang: "en-US" },
  { name: "Monica", lang: "es-ES" },
  { name: "Google español", lang: "es-ES" },
  { name: "Thomas", lang: "fr_FR" },
];

test("the device voices for a language, the good ones first, never the novelty ones", () => {
  assert.deepEqual(
    voicesFor(VOICES, "en").map((v) => v.name),
    ["Google UK English Female", "Microsoft Aria Online (Natural)", "Samantha"],
  );
  assert.deepEqual(voicesFor(VOICES, "fr").map((v) => v.name), ["Thomas"]);
  assert.deepEqual(voicesFor(VOICES, "ja"), []);
});

test("the remembered voice wins, else a stable pick for the agent among the good voices", () => {
  assert.equal(pickVoice(VOICES, { language: "en", seed: "a", preferred: "Samantha" })?.name, "Samantha");
  // A remembered voice for another language is not used.
  assert.notEqual(pickVoice(VOICES, { language: "es", seed: "a", preferred: "Samantha" })?.name, "Samantha");
  const a = pickVoice(VOICES, { language: "en", seed: "juniper" });
  assert.ok(a && /Google|Natural/.test(a.name));
  assert.equal(pickVoice(VOICES, { language: "en", seed: "juniper" })?.name, a.name); // stable
  assert.equal(pickVoice(VOICES, { language: "es", seed: "x" })?.name, "Google español");
  assert.equal(pickVoice(VOICES, { language: "ja", seed: "x" }), null);
  assert.equal(pickVoice([], { language: "en", seed: "x" }), null);
});

test("the persona sets the pace and the pitch", () => {
  assert.deepEqual(voiceTone("balanced"), { rate: 1, pitch: 1 });
  assert.ok(voiceTone("concise").rate > 1);
  assert.ok(voiceTone("detailed").rate < 1);
  assert.ok(voiceTone("friendly").pitch > 1);
  assert.ok(voiceTone("direct").pitch < 1);
  assert.deepEqual(voiceTone("unknown"), { rate: 1, pitch: 1 });
});

test("speeds", () => {
  assert.deepEqual([...SPEEDS], [0.75, 1, 1.25, 1.5, 2]);
  assert.equal(speedLabel(1), "1x");
  assert.equal(speedLabel(1.25), "1.25x");
  assert.equal(nearestSpeed(1.1), 1);
  assert.equal(nearestSpeed(1.9), 2);
  assert.equal(nearestSpeed(undefined), 1);
  assert.deepEqual(LENGTHS.map((l) => l.value), ["short", "standard"]);
});

test("the playhead: segment starts by length, the segment at a fraction, the word at a boundary", () => {
  const segs = [{ text: "Hi Sam." }, { text: "The price goes up eight percent." }, { text: "Bye." }];
  const starts = segmentStarts(segs);
  assert.equal(starts.length, 4);
  assert.equal(starts[0], 0);
  assert.equal(starts[3], 1);
  assert.ok(starts[1]! < starts[2]!);
  assert.equal(segmentAt(starts, 0), 0);
  assert.equal(segmentAt(starts, starts[1]! + 0.01), 1);
  assert.equal(segmentAt(starts, 1), 2);
  assert.equal(segmentAt(starts, -1), 0);
  const text = "The price goes up";
  assert.deepEqual(wordAt(text, 4), [4, 9]);
  assert.deepEqual(wordAt(text, 6), [4, 9]);
  assert.equal(wordAt(text, 99), null);
  assert.equal(clock(92), "1:32");
  assert.equal(clock(-3), "0:00");
  assert.equal(segmentSeconds("one two three four five six seven eight nine ten", 1), 4);
  assert.equal(segmentSeconds("one two three four five six seven eight nine ten", 2), 2);
});

test("state copy and the agent's face", () => {
  assert.equal(isWriting({ status: "pending" }), true);
  assert.equal(isWriting({ status: "composing" }), true);
  assert.equal(isWriting({ status: "ready" }), false);
  assert.equal(isWriting(null), false);
  assert.equal(coverLine({ meeting_title: "Pricing review", trigger: "meeting_end" }), "After Pricing review");
  assert.equal(coverLine({ meeting_title: null, trigger: "on_demand" }), "Since your last briefing");
  assert.match(unavailableCopy("budget"), /budget/);
  assert.match(unavailableCopy("timeout"), /could not be reached/);
  assert.match(unavailableCopy(null), /ask again/);
  // A missing seed draws the default face from the person (never their own face).
  assert.equal(agentSeed(null, "u1"), agentSeed(undefined, "u1"));
  assert.notEqual(agentSeed(null, "u1"), agentSeed(null, "u2"));
  for (const copy of [coverLine({ meeting_title: "X", trigger: "meeting_end" }), unavailableCopy("budget")]) {
    assert.doesNotMatch(copy, /[–—]/); // no dashes in visible copy
  }
});
