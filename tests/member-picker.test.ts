// Run: npm test
// The member picker's rules: picking and removing keep the picking order, the cluster of faces
// stays one line and folds the rest into a "+N" ball, and the announcements read plainly.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CLUSTER_MAX,
  clusterOf,
  neighbourAfterRemoval,
  peopleCount,
  selectionMessage,
  toggleId,
} from "../src/components/meetings/picker-cluster.ts";

test("select adds a person at the end, in picking order", () => {
  assert.deepEqual(toggleId([], "raj"), ["raj"]);
  assert.deepEqual(toggleId(["raj"], "priya"), ["raj", "priya"]);
});

test("deselect removes only that person and keeps the rest in order", () => {
  assert.deepEqual(toggleId(["raj", "priya", "sarah"], "priya"), ["raj", "sarah"]);
  assert.deepEqual(toggleId(["raj"], "raj"), []);
});

test("up to eight picked all show as balls, with no +N", () => {
  const eight = Array.from({ length: CLUSTER_MAX }, (_, i) => `p${i}`);
  assert.equal(CLUSTER_MAX, 8);
  assert.deepEqual(clusterOf(eight), { visible: eight, hidden: [] });
  assert.deepEqual(clusterOf(["a", "b"]), { visible: ["a", "b"], hidden: [] });
});

test("past eight, the earliest fold into +N and the latest pick stays visible", () => {
  const eleven = Array.from({ length: 11 }, (_, i) => `p${i}`);
  const { visible, hidden } = clusterOf(eleven);
  assert.equal(visible.length + 1, CLUSTER_MAX); // seven faces and the +N ball fill one line
  assert.deepEqual(hidden, ["p0", "p1", "p2", "p3"]);
  assert.equal(visible.at(-1), "p10");
  // Expanded shows everyone.
  assert.deepEqual(clusterOf(eleven, CLUSTER_MAX, true), { visible: eleven, hidden: [] });
  // Removing a hidden person shrinks +N; dropping back to eight removes it.
  assert.equal(clusterOf(toggleId(eleven, "p0")).hidden.length, 3);
  assert.deepEqual(clusterOf(eleven.slice(0, 9)).hidden, ["p0", "p1"]);
  assert.deepEqual(clusterOf(eleven.slice(0, 8)).hidden, []);
});

test("count and announcements", () => {
  assert.equal(peopleCount(0), "No one picked yet");
  assert.equal(peopleCount(1), "1 person");
  assert.equal(peopleCount(3), "3 people");
  assert.equal(selectionMessage("Priya Nair", true, 3), "Added Priya Nair. 3 people picked.");
  assert.equal(selectionMessage("Priya Nair", false, 0), "Removed Priya Nair. No one picked.");
});

test("focus after a removal goes to the next item, else the previous, else nowhere", () => {
  assert.equal(neighbourAfterRemoval(0, 3), 0);
  assert.equal(neighbourAfterRemoval(2, 3), 1);
  assert.equal(neighbourAfterRemoval(0, 1), null);
});
