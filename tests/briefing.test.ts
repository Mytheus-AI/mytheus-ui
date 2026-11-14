// Run: npm test
// A briefing from your agent: where "open the moment" goes, where the playhead is, and the copy
// for each state. (The voice is the Myte's own: tests/voice-*.test.ts.)
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
  segmentAt,
  segmentSeconds,
  segmentStarts,
  speedLabel,
  unavailableCopy,
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
