// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildStarters, pageStarters, weekOf, whenLabel } from "../src/lib/ask-myte/starters.ts";

// Saturday Nov 14 2026, 18:00 UTC
const NOW = new Date("2026-11-14T18:00:00Z");

test("six starters from a real week", () => {
  const s = buildStarters({
    now: NOW,
    timeZone: "UTC",
    nextMeeting: { title: "Test", start: "2026-11-15T23:00:00Z" },
    openTasks: [{ due_date: "2026-11-13" }, { due_date: "2026-11-15" }, { due_date: "2026-11-30" }, { due_date: null }],
    openPromises: 1,
    decisions: [
      { content: "Drop Drive", meeting_title: "Feature Update - Backend", created_at: "2026-11-12T20:00:00Z" },
      { content: "Live on join", meeting_title: "Feature Update - Backend", created_at: "2026-11-12T20:01:00Z" },
      { content: "Old", meeting_title: "Kickoff", created_at: "2026-11-01T10:00:00Z" },
    ],
  });
  assert.equal(s.length, 6);
  assert.deepEqual(s.map((x) => x.id), ["prep", "owe", "changed", "capacity", "decided", "help"]);
  assert.equal(s[0].question, "Prep me for Test");
  assert.equal(s[0].hint, "Tomorrow, 11:00 PM");
  assert.equal(s[1].hint, "2 tasks, 1 promise");
  assert.equal(s[2].hint, "2 new decisions");
  assert.equal(s[4].question, "What did we decide in Feature Update - Backend?");
  assert.equal(s[4].hint, "2 decisions");
});

test("falls back to plain questions when reads failed", () => {
  const s = buildStarters({ now: NOW, timeZone: "UTC", nextMeeting: null, openTasks: null, decisions: null });
  assert.equal(s.length, 6);
  assert.equal(s[0].question, "What's on my calendar this week?");
  assert.equal(s[1].hint, "Tasks and promises");
  assert.equal(s[4].question, "What have we decided lately?");
});

test("live meeting and time zones", () => {
  const s = buildStarters({ now: NOW, timeZone: "UTC", nextMeeting: { title: "Standup", start: null, live: true }, openTasks: [], decisions: [] });
  assert.equal(s[0].hint, "Live now");
  assert.equal(s[1].hint, "Nothing due yet");
  assert.equal(whenLabel("2026-11-14T20:30:00Z", NOW, "UTC"), "Today, 8:30 PM");
  // 23:30 UTC on Nov 14 is already Nov 15 in Kolkata
  assert.equal(whenLabel("2026-11-14T23:30:00Z", NOW, "Asia/Kolkata"), "Tomorrow, 5:00 AM");
  assert.deepEqual(weekOf("2026-11-14"), { start: "2026-11-09", end: "2026-11-15" });
  assert.deepEqual(weekOf("2026-11-09"), { start: "2026-11-09", end: "2026-11-15" });
});

test("page starters", () => {
  assert.equal(pageStarters(null).length, 0);
  assert.equal(pageStarters({ kind: "meeting", id: "x", title: "Weekly" }).length, 3);
  assert.equal(pageStarters({ kind: "person", id: "x", title: "Maya Chen" })[0].question, "What is Maya Chen working on?");
});
