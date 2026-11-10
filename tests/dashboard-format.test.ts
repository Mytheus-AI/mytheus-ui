// Run: npm test  (node --test with type stripping)
// The dashboard's relative labels are computed against the request's own clock, not a fixed
// sample "now" (the panels used to render against a hard-coded 2026-07-01).
import assert from "node:assert/strict";
import { test } from "node:test";

import { daysFromNow, dueLabel, minutesBetween } from "../src/components/app/dashboard/format.ts";

const now = new Date("2030-03-10T15:00:00Z");

test("due labels follow the clock they are given", () => {
  assert.equal(dueLabel("2030-03-10", now), "Due today");
  assert.equal(dueLabel("2030-03-11", now), "Due tomorrow");
  assert.equal(dueLabel("2030-03-15", now), "Due Mar 15");
  assert.equal(dueLabel("2030-03-08", now), "Overdue, Mar 8");
});

test("the same due date reads differently on a different day", () => {
  const later = new Date("2030-03-12T09:00:00Z");
  assert.equal(daysFromNow("2030-03-11", now), 1);
  assert.equal(daysFromNow("2030-03-11", later), -1);
  assert.equal(dueLabel("2030-03-11", later), "Overdue, Mar 11");
});

test("a meeting length needs both ends", () => {
  assert.equal(minutesBetween("2030-03-10T15:00:00Z", "2030-03-10T15:45:00Z"), 45);
  assert.equal(minutesBetween("2030-03-10T15:00:00Z", undefined), undefined);
  assert.equal(minutesBetween("2030-03-10T15:00:00Z", "2030-03-10T14:00:00Z"), undefined);
});
