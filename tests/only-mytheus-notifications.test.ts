// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { describeNotification, type FeedRowInput } from "../src/components/notifications/alert-copy.ts";

const R = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const A = "11111111-2222-4333-8444-555555555555";
const M = "99999999-8888-4777-8666-555555555555";

const row = (over: Partial<FeedRowInput>): FeedRowInput => ({
  id: "n1",
  meeting_id: null,
  source: "notification",
  alert_type: null,
  priority: 3,
  title: "",
  body: "",
  link: null,
  payload: null,
  status: "unread",
  created_at: "2026-11-11T09:00:00Z",
  ...over,
});

test("a decision reversal is a choice waiting on you, linking to the tasks banner", () => {
  const n = describeNotification(
    row({
      title: "Decision changed: re-scope, keep or close this task?",
      body: '"Ship to 40" was replaced by "Ship to 10". Your task: Email the 40 customers',
      payload: { source_event_id: `decision-reversal:${R}` },
    }),
  );
  assert.equal(n.kind, "decision_changed");
  assert.equal(n.priority, 2);
  assert.equal(n.sourceEventId, `decision-reversal:${R}`);
  assert.equal(n.href, `/work/tasks?reversal=${R}`);
  assert.match(n.body, /Your task/);
});

test("the server's link wins when it sends one", () => {
  const n = describeNotification(row({ link: `/work/tasks?reversal=${R}`, payload: { source_event_id: `decision-reversal:${R}` } }));
  assert.equal(n.href, `/work/tasks?reversal=${R}`);
  assert.equal(describeNotification(row({ link: "https://evil.example", payload: { source_event_id: `decision-reversal:${R}` } })).href, `/work/tasks?reversal=${R}`);
});

test("promise drift leads the owner to the task and the host to the meeting", () => {
  const owner = describeNotification(row({ payload: { source_event_id: `promise-drift:${A}:2026-11-14:owner` } }));
  assert.equal(owner.kind, "promise_drift");
  assert.equal(owner.href, `/work/tasks?focus=${A}`);
  assert.equal(owner.linkLabel, "Open the task");
  const host = describeNotification(row({ meeting_id: M, payload: { source_event_id: `promise-drift:${A}:2026-11-14:host` } }));
  assert.equal(host.href, `/meetings/${M}`);
  assert.equal(host.linkLabel, "Open the meeting");
});

test("the weekly digest informs and opens the digest", () => {
  const n = describeNotification(row({ priority: 2, payload: { source_event_id: `weekly-digest:${R}` } }));
  assert.equal(n.kind, "weekly_digest");
  assert.equal(n.priority, 3);
  assert.equal(n.href, "/digest");
  assert.equal(n.title, "What changed for you this week");
});

test("other notifications are untouched", () => {
  const n = describeNotification(row({ title: "Quick status on QA?", link: "/work/updates", payload: { source_event_id: "status-request:x" } }));
  assert.equal(n.kind, "reminder");
  assert.equal(n.sourceEventId, undefined);
});
