// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { cardOwner } from "../src/lib/realtime/ownership.ts";

const me = "11111111-1111-4111-8111-111111111111";
const maya = "22222222-2222-4222-8222-222222222222";
const gone = "33333333-3333-4333-8333-333333333333";
const guest = { meId: me, steers: false, participantIds: [me, maya] };
const host = { ...guest, steers: true };

test("cardOwner gives a decision to whoever steers the meeting", () => {
  assert.deepEqual(cardOwner({ kind: "decision" }, host), { mine: true, by: "host" });
  assert.deepEqual(cardOwner({ kind: "decision" }, guest), { mine: false, waitsFor: "host" });
});

test("cardOwner gives a task to the person it is for, and to nobody else", () => {
  assert.deepEqual(cardOwner({ kind: "action", assigneeId: me }, guest), { mine: true, by: "assignee" });
  assert.deepEqual(cardOwner({ kind: "action", assigneeId: maya }, guest), { mine: false, waitsFor: "assignee", userId: maya });
  // not even the host settles someone else's task
  assert.deepEqual(cardOwner({ kind: "action", assigneeId: maya }, host), { mine: false, waitsFor: "assignee", userId: maya });
  assert.deepEqual(cardOwner({ kind: "action", assigneeId: me }, host), { mine: true, by: "assignee" });
});

test("cardOwner leaves a task with no owner in the meeting to the host", () => {
  assert.deepEqual(cardOwner({ kind: "action", assigneeId: null }, host), { mine: true, by: "host" });
  assert.deepEqual(cardOwner({ kind: "action", assigneeId: null }, guest), { mine: false, waitsFor: "host" });
  assert.deepEqual(cardOwner({ kind: "action", assigneeId: gone }, host), { mine: true, by: "host" });
});

test("cardOwner ignores an assignee on a decision", () => {
  assert.deepEqual(cardOwner({ kind: "decision", assigneeId: maya }, host), { mine: true, by: "host" });
});
