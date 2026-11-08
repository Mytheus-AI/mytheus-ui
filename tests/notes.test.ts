// Run: npm test  (node --test with type stripping; no test framework is installed in this repo)
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyNoteDelta,
  applyNoteFinal,
  emptyNotesState,
  hydrateNotes,
  orderedNotes,
} from "../src/lib/realtime/notes.ts";

const W1 = "m:0";
const W2 = "m:30000";

test("deltas build a draft and the final replaces it", () => {
  let s = applyNoteDelta(emptyNotesState, { windowId: W1, seq: 0, delta: "- You ", done: false });
  s = applyNoteDelta(s, { windowId: W1, seq: 1, delta: "own it.", done: false });
  assert.deepEqual(orderedNotes(s).map((n) => [n.text, n.final]), [["- You own it.", false]]);
  s = applyNoteFinal(s, { windowId: W1, content: "- You own the migration." });
  assert.deepEqual(orderedNotes(s).map((n) => [n.text, n.final]), [["- You own the migration.", true]]);
});

test("a duplicate, stale or late delta never corrupts a note", () => {
  let s = applyNoteDelta(emptyNotesState, { windowId: W1, seq: 0, delta: "a", done: false });
  s = applyNoteDelta(s, { windowId: W1, seq: 0, delta: "a", done: false });
  assert.equal(orderedNotes(s)[0].text, "a");
  s = applyNoteFinal(s, { windowId: W1, content: "final" });
  s = applyNoteDelta(s, { windowId: W1, seq: 5, delta: " late", done: false });
  assert.equal(orderedNotes(s)[0].text, "final");
});

test("a missed stream is no loss: the final alone makes the note", () => {
  const s = applyNoteFinal(emptyNotesState, { windowId: W2, content: "- only the final" });
  assert.deepEqual(orderedNotes(s).map((n) => n.final), [true]);
});

test("re-hydrate merges by window and orders by window start, not arrival", () => {
  let s = applyNoteFinal(emptyNotesState, { windowId: W2, content: "later" });
  s = hydrateNotes(s, [
    { windowId: W1, content: "earlier" },
    { windowId: W2, content: "later" },
  ]);
  assert.deepEqual(orderedNotes(s).map((n) => n.text), ["earlier", "later"]);
});
