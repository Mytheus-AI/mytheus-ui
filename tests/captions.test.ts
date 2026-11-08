// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { applyCaption, emptyCaptionState } from "../src/lib/realtime/captions.ts";

const base = { speakerId: "u1", startMs: 0, endMs: 500, confidence: 0.9 };

test("silence (empty or whitespace text) never becomes a caption line", () => {
  let s = applyCaption(emptyCaptionState, { ...base, chunkId: "c1", text: "", isFinal: false });
  s = applyCaption(s, { ...base, chunkId: "c2", text: "   ", isFinal: true });
  assert.deepEqual(s.lines, []);
});

test("a real utterance still streams and finalizes", () => {
  let s = applyCaption(emptyCaptionState, { ...base, chunkId: "c1", text: "hello", isFinal: false });
  s = applyCaption(s, { ...base, chunkId: "c1", text: "hello there", isFinal: true });
  assert.deepEqual(
    s.lines.map((l) => [l.text, l.isFinal]),
    [["hello there", true]],
  );
});
