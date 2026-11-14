// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { activeDismissals, buildNudges, dayOf, dismiss, visibleNudges } from "../src/lib/ask-myte/nudges.ts";

const NOW = new Date("2026-11-14T10:00:00Z");
const tz = "Europe/London";

test("nothing to say, nothing said", () => {
  assert.deepEqual(buildNudges({ now: NOW, timeZone: tz }), []);
});

test("ranked: meeting soon, peer question, routine, overdue, due today, new decisions", () => {
  const all = buildNudges({
    now: NOW,
    timeZone: tz,
    meetings: [
      { id: "m-later", title: "Later", start: "2026-11-14T12:00:00Z" },
      { id: "m-soon", title: "Test", start: "2026-11-14T10:10:00Z", status: "scheduled" },
      { id: "m-live", title: "Live one", start: "2026-11-14T10:05:00Z", status: "live" },
    ],
    tasks: [
      { id: "t1", title: "Reconnect Google Calendar", due_date: "2026-11-14" },
      { id: "t2", title: "Old thing", due_date: "2026-11-10" },
      { id: "t3", title: "No date", due_date: null },
    ],
    promises: [{ id: "p1", title: "Send Maya the deck", due_at: "2026-11-14T17:00:00Z" }],
    decisions: [{ id: "d1", content: "x", created_at: "2026-11-13T09:00:00Z" }, { id: "d2", content: "y", created_at: "2026-11-01T09:00:00Z" }],
    lastVisit: "2026-11-12T09:00:00Z",
    peerQuestions: [{ id: "q1", from_name: "Samar", question: "Where are we on pricing?" }],
    routinesReady: [{ id: "r1", thread_id: "th1", words: "Your Monday update is ready", question: "What changed in pricing?" }],
  });
  assert.deepEqual(all.map((n) => n.kind), ["meeting", "peer", "routine", "overdue", "due", "decisions"]);
  assert.equal(all[0].text, "Test starts in 10 minutes. Want a 30-second prep?");
  assert.deepEqual(all[0].action, { type: "ask", question: "Give me a 30-second prep for Test." });
  assert.deepEqual(all[1].action, { type: "open", href: "/inbox?peer_question=q1", label: "Review" });
  assert.equal(all[2].text, "Your Monday update is ready: What changed in pricing?");
  assert.equal(all[3].text, '"Old thing" is overdue. Want a plan for it?');
  assert.equal(all[4].text, "2 things you owe are due today.");
  assert.equal(all[5].text, "1 new decision since you were last here.");
});

test("a meeting more than 15 minutes away, or a first visit, says nothing", () => {
  assert.deepEqual(buildNudges({ now: NOW, timeZone: tz, meetings: [{ id: "m", title: "x", start: "2026-11-14T10:20:00Z" }] }), []);
  assert.deepEqual(buildNudges({ now: NOW, timeZone: tz, decisions: [{ id: "d", content: "x", created_at: "2026-11-14T09:00:00Z" }], lastVisit: null }), []);
});

test("dismissed for the day only", () => {
  const today = dayOf(NOW, tz);
  const stored = dismiss(null, today, "due:2026-11-14");
  assert.ok(activeDismissals(stored, today).has("due:2026-11-14"));
  assert.equal(activeDismissals(stored, "2026-11-15").size, 0);
  const all = buildNudges({ now: NOW, timeZone: tz, tasks: [{ id: "t", title: "A", due_date: "2026-11-14" }, { id: "u", title: "B", due_date: "2026-11-01" }] });
  assert.deepEqual(visibleNudges(all, activeDismissals(stored, today), 3).map((n) => n.kind), ["overdue"]);
  assert.equal(visibleNudges(all, new Set(), 1).length, 1);
});

test("days in a zone", () => {
  assert.equal(dayOf(new Date("2026-11-14T23:30:00Z"), "Asia/Kolkata"), "2026-11-15");
  assert.equal(dayOf(new Date("2026-11-14T23:30:00Z"), "Europe/London"), "2026-11-14");
});
