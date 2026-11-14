// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { capacityView, decisionView, loadOf, meetingView, minutesWords, relationWords } from "../src/lib/ask-myte/cards.ts";

const M = "11111111-1111-4111-8111-111111111111";

test("meeting from get_meeting_outcome and from list_my_schedule", () => {
  const outcome = meetingView(
    {
      id: M,
      title: "Feature Update - Backend",
      status: "ended",
      scheduled_start: "2026-11-12T17:30:00Z",
      host_name: "Maya",
      agenda: [{ title: "Drive scope", status: "covered" }, { title: "" }],
      decisions: [{ id: "d", content: "Drop Drive" }],
      actions: [{ id: "a", content: "Reconnect Calendar", owner_name: "Sushan", due_date: "2026-11-13", status: "confirmed" }],
    },
    [],
  );
  assert.equal(outcome.id, M);
  assert.equal(outcome.start, "2026-11-12T17:30:00Z");
  assert.equal(outcome.agenda.length, 1);
  assert.deepEqual(outcome.decisions, ["Drop Drive"]);
  assert.equal(outcome.actions[0].owner, "Sushan");
  const sched = meetingView({ id: "x", title: "Test", start: "2026-11-15T23:00:00Z", attendee_count: 4, attendance: "agent", live: false, hosting: true }, []);
  assert.equal(sched.id, null, "a non-UUID id never becomes a link");
  assert.equal(sched.attendees, 4);
  assert.equal(sched.hosting, true);
  assert.equal(meetingView(null, [{ n: 1, kind: "meeting", title: "Standup", text: "", meeting_id: M }]).id, M);
});

test("decision lineage never shows a hidden decision's words", () => {
  const v = decisionView(
    {
      id: "d1",
      content: "Drop Google Drive access",
      status: "confirmed",
      rationale: "Keeps us out of the security assessment",
      lineage: [
        { relation: "subject", visible: true, content: "Drop Google Drive access" },
        { relation: "supersedes", visible: true, content: "Read Drive attachments", status: "superseded" },
        { relation: "superseded_by", visible: false, content: "SECRET", status: "confirmed" },
        { relation: "related", visible: true, content: "" },
      ],
    },
    [],
  );
  assert.equal(v.rationale, "Keeps us out of the security assessment");
  assert.equal(v.lineage.length, 2);
  assert.equal(v.lineage[0].content, "Read Drive attachments");
  assert.equal(v.lineage[1].content, null);
  assert.equal(v.lineage[1].status, null);
  assert.ok(!JSON.stringify(v).includes("SECRET"));
  assert.equal(relationWords("supersedes"), "Replaces");
  assert.equal(relationWords("superseded_by"), "Replaced by");
  assert.equal(relationWords("follows_up_on"), "Follows up on");
});

test("capacity: a day, a week, or nothing", () => {
  const day = capacityView({ message: "Friday already has 3 items.", level: "full", items_on_day: 3, due_label: "Fri Nov 20", meeting_minutes: 150, suggested_label: "Mon Nov 23" }, []);
  assert.equal(day.shape, "day");
  if (day.shape === "day") {
    assert.equal(day.load, "full");
    assert.equal(day.suggestedLabel, "Mon Nov 23");
  }
  const week = capacityView({ days: [{ date: "2026-11-16", label: "Mon", items: 2, level: "light" }, { label: "Tue", items: 0, away: true }], overdue: 1, calendar_synced: false }, []);
  assert.equal(week.shape, "week");
  if (week.shape === "week") {
    assert.deepEqual(week.days.map((d) => d.load), ["light", "away"]);
    assert.equal(week.calendarSynced, false);
  }
  assert.deepEqual(capacityView(null, [{ n: 1, kind: "action", title: "t", text: "You have room." }]), { shape: "none", text: "You have room." });
  assert.equal(loadOf("amber"), "busy");
  assert.equal(minutesWords(150), "2 h 30 min");
  assert.equal(minutesWords(0), null);
});
