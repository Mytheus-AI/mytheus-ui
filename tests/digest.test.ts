// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { dayMonth, digestSections, digestSummary, isQuietWeek, promiseDue, promiseHref, weekOf, weekRange } from "../src/lib/digest.ts";
import type { WeeklyDigest } from "../src/lib/api/only-mytheus-types.ts";

const QUIET: WeeklyDigest = {
  id: null,
  week_start: "2026-11-02",
  week_end: "2026-11-08",
  created_at: null,
  topics: ["pricing"],
  item_count: 0,
  decisions: [],
  decision_changes: [],
  actions_assigned: [],
  actions_closed: [],
  promises_due: [],
};

test("the week reads as a range", () => {
  assert.equal(weekRange("2026-11-02", "2026-11-08"), "Nov 2 to 8, 2026");
  assert.equal(weekRange("2026-10-26", "2026-11-01"), "Oct 26 to Nov 1, 2026");
  assert.equal(weekRange("2025-12-29", "2026-01-04"), "Dec 29, 2025 to Jan 4, 2026");
  assert.equal(weekRange("bad", "2026-01-04"), "");
  assert.equal(weekOf("2026-11-02"), "Week of Nov 2");
  assert.equal(dayMonth("2026-11-14"), "Nov 14");
  assert.equal(dayMonth(null), "");
});

test("five sections in reading order, missing arrays read as empty", () => {
  const sections = digestSections({ ...QUIET, promises_due: undefined as never });
  assert.deepEqual(sections.map((s) => s.key), ["decisions", "decision_changes", "actions_assigned", "actions_closed", "promises_due"]);
  assert.equal(sections[4].items.length, 0);
});

test("a quiet week is said plainly", () => {
  assert.equal(isQuietWeek(QUIET), true);
  assert.equal(digestSummary(QUIET), "A quiet week: nothing on your topics changed.");
  const busy: WeeklyDigest = {
    ...QUIET,
    item_count: 2,
    decisions: [{ id: "d", content: "Price at $49", meeting_id: "m", meeting_title: "Pricing", decided_at: "2026-11-03T10:00:00Z", matched_topics: ["pricing"] }],
    actions_closed: [{ id: "a", content: "Draft FAQ", meeting_id: null, meeting_title: null, due_date: null, status: "done", changed_at: null }],
  };
  assert.equal(isQuietWeek(busy), false);
  assert.equal(digestSummary(busy), "2 things changed for you.");
});

test("promises say when they are due and where they lead", () => {
  const p = { kind: "action" as const, id: "a1", content: "Send the deck", due_date: "2026-11-14", due_hint: null, meeting_id: null, meeting_title: null };
  assert.equal(promiseDue(p), "Due Nov 14");
  assert.equal(promiseHref(p), "/work/tasks?focus=a1");
  const c = { ...p, kind: "commitment" as const, due_date: null, due_hint: "by Friday" };
  assert.equal(promiseDue(c), "Due by Friday");
  assert.equal(promiseHref(c), "/work/promises");
  assert.equal(promiseDue({ ...c, due_hint: null }), "");
});

test("a digest with lists left out reads as empty lists", async () => {
  const { normalizeDigest } = await import("../src/lib/digest.ts");
  const d = normalizeDigest({ week_start: "2026-11-02", week_end: "2026-11-08", item_count: 0 });
  assert.deepEqual(d.topics, []);
  assert.deepEqual(d.promises_due, []);
  assert.equal(d.id, null);
  assert.equal(d.created_at, null);
  assert.equal(isQuietWeek(d), true);
});
