// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PERSONAL_LIMITS,
  composeStatusText,
  groupPromises,
  itemsOf,
  newestOpen,
  normalizeTopic,
  parseStatusText,
  relativeDay,
  upcomingWhen,
  validateTopic,
  type PromiseView,
} from "../src/lib/api/personal-types.ts";
import { describeNotification, safeLink } from "../src/components/notifications/alert-copy.ts";

const M1 = "11111111-1111-4111-8111-111111111111";
const M2 = "22222222-2222-4222-8222-222222222222";

const promise = (over: Partial<PromiseView>): PromiseView => ({
  id: "p",
  user_id: "u",
  meeting_id: M1,
  meetingTitle: "Pricing review",
  content: "Send the deck",
  due_hint: null,
  status: "open",
  created_at: "2026-11-05T10:00:00Z",
  updated_at: "2026-11-05T10:00:00Z",
  done_at: null,
  ...over,
});

test("groupPromises groups open by meeting, newest meeting first, said order inside", () => {
  const { open, done } = groupPromises([
    promise({ id: "a", meeting_id: M1, created_at: "2026-11-05T10:05:00Z" }),
    promise({ id: "b", meeting_id: M2, meetingTitle: "Weekly sync", created_at: "2026-11-08T09:00:00Z" }),
    promise({ id: "c", meeting_id: M1, created_at: "2026-11-05T10:01:00Z" }),
    promise({ id: "d", status: "done", done_at: "2026-11-06T00:00:00Z" }),
    promise({ id: "e", status: "done", done_at: "2026-11-09T00:00:00Z" }),
    promise({ id: "f", status: "dismissed" }),
  ]);
  assert.deepEqual(open.map((g) => g.meetingId), [M2, M1]);
  assert.deepEqual(open[1].items.map((p) => p.id), ["c", "a"]);
  assert.equal(open[1].latestAt, "2026-11-05T10:05:00Z");
  assert.deepEqual(done.map((p) => p.id), ["e", "d"]);
});

test("groupPromises with nothing open returns empty groups", () => {
  assert.deepEqual(groupPromises([promise({ status: "dismissed" })]), { open: [], done: [] });
});

test("newestOpen keeps only open promises, newest first, capped", () => {
  const list = newestOpen(
    [
      promise({ id: "a", created_at: "2026-11-01T00:00:00Z" }),
      promise({ id: "b", created_at: "2026-11-03T00:00:00Z" }),
      promise({ id: "c", status: "done" }),
      promise({ id: "d", created_at: "2026-11-02T00:00:00Z" }),
    ],
    2,
  );
  assert.deepEqual(list.map((p) => p.id), ["b", "d"]);
});

test("composeStatusText joins the quick pick and the note in one line", () => {
  assert.equal(composeStatusText("on_track", ""), "On track");
  assert.equal(composeStatusText("blocked", "  waiting on\n legal "), "Blocked: waiting on legal");
  assert.equal(composeStatusText(null, " shipped Friday "), "shipped Friday");
  assert.equal(composeStatusText(null, "   "), "");
  const long = composeStatusText("done", "x".repeat(900));
  assert.equal(long.length, PERSONAL_LIMITS.statusText);
  assert.ok(long.startsWith("Done: "));
});

test("parseStatusText reads the pick back out", () => {
  assert.deepEqual(parseStatusText("Blocked: waiting on legal"), { pick: "blocked", note: "waiting on legal" });
  assert.deepEqual(parseStatusText("on track"), { pick: "on_track", note: "" });
  assert.deepEqual(parseStatusText("Shipped it"), { pick: null, note: "Shipped it" });
  assert.deepEqual(parseStatusText(null), { pick: null, note: "" });
  for (const pick of ["on_track", "blocked", "done"] as const) {
    assert.deepEqual(parseStatusText(composeStatusText(pick, "a note")), { pick, note: "a note" });
  }
});

test("validateTopic mirrors the API's rules", () => {
  assert.deepEqual(validateTopic("  SSO   rollout ", []), { ok: true, topic: "SSO rollout" });
  assert.equal(normalizeTopic(" a  b "), "a b");
  assert.equal(validateTopic("   ", []).ok, false);
  const long = validateTopic("x".repeat(81), []);
  assert.equal(long.ok, false);
  assert.equal(validateTopic("x".repeat(80), []).ok, true);
  const dupe = validateTopic("sso", ["SSO"]);
  assert.deepEqual(dupe, { ok: false, message: "You already watch SSO." });
  const full = validateTopic("Pricing", Array.from({ length: 20 }, (_, i) => `t${i}`));
  assert.equal(full.ok, false);
  assert.match(full.ok ? "" : full.message, /up to 20/);
});

test("itemsOf tolerates an items envelope, a bare array, or junk", () => {
  assert.deepEqual(itemsOf<number>({ items: [1, 2] }), [1, 2]);
  assert.deepEqual(itemsOf<number>([3]), [3]);
  assert.deepEqual(itemsOf<number>(null), []);
  assert.deepEqual(itemsOf<number>({ items: "no" }), []);
});

test("relativeDay and upcomingWhen speak in days", () => {
  const now = new Date(Date.UTC(2026, 10, 10, 12, 0));
  assert.equal(relativeDay(new Date(Date.UTC(2026, 10, 10, 8, 0)).toISOString(), now), "today");
  assert.equal(relativeDay(new Date(Date.UTC(2026, 10, 9, 23, 0)).toISOString(), now), "yesterday");
  assert.equal(relativeDay(new Date(Date.UTC(2026, 10, 7, 9, 0)).toISOString(), now), "3 days ago");
  assert.equal(relativeDay(new Date(Date.UTC(2026, 9, 1, 9, 0)).toISOString(), now), "on 1 Oct");
  assert.equal(relativeDay(new Date(Date.UTC(2025, 9, 1, 9, 0)).toISOString(), now), "on 1 Oct 2025");
  assert.equal(relativeDay("nope", now), "");
  assert.equal(upcomingWhen(new Date(Date.UTC(2026, 10, 10, 14, 30)).toISOString(), now), "today at 14:30");
  assert.equal(upcomingWhen(new Date(Date.UTC(2026, 10, 11, 9, 0)).toISOString(), now), "tomorrow at 09:00");
  assert.equal(upcomingWhen(new Date(Date.UTC(2026, 10, 12, 10, 0)).toISOString(), now), "Thu 12 Nov at 10:00");
  assert.equal(upcomingWhen(null, now), "");
});

const row = (over: Partial<Parameters<typeof describeNotification>[0]>) => ({
  id: "n1",
  meeting_id: M1,
  source: "agent_alert",
  alert_type: null,
  priority: 3,
  title: "",
  body: "",
  link: null,
  payload: null,
  status: "unread",
  created_at: "2026-11-10T09:00:00Z",
  ...over,
});

test("a topic_watch alert names the topic and the meeting and links to it", () => {
  const item = describeNotification(
    row({
      alert_type: "topic_watch",
      payload: { alert_type: "topic_watch", topic: "SSO", meeting_id: M2, meeting_title: "Pricing review", snippet: "we need SSO for the Acme deal" },
    }),
  );
  assert.equal(item.kind, "topic_watch");
  assert.equal(item.title, "SSO came up in Pricing review");
  assert.equal(item.quote, "we need SSO for the Acme deal");
  assert.equal(item.href, `/meetings/${M2}`);
  assert.equal(item.unread, true);
  assert.equal(item.priority, 3);
});

test("an already_decided alert quotes the decision and links to the log", () => {
  const item = describeNotification(
    row({
      alert_type: null,
      status: "read",
      payload: {
        alert_type: "already_decided",
        decision_id: M1,
        decision_content: "Annual plans only for enterprise",
        decided_at: "2026-10-02T10:00:00Z",
        meeting_id: M2,
        meeting_title: "Weekly sync",
      },
    }),
  );
  assert.equal(item.kind, "already_decided");
  assert.equal(item.quote, "Annual plans only for enterprise");
  assert.match(item.body, /2 Oct 2026/);
  assert.equal(item.href, "/decisions");
  assert.equal(item.unread, false);
  assert.equal(item.priority, 2);
});

test("plain reminders keep their stored copy and only same-site links", () => {
  const item = describeNotification(
    row({ source: "notification", title: "Quick status on Send the deck?", link: "/status-requests" }),
  );
  assert.equal(item.kind, "reminder");
  assert.equal(item.href, "/status-requests");
  assert.equal(item.linkLabel, "Answer it");
  assert.equal(safeLink("https://evil.example"), null);
  assert.equal(safeLink("//evil.example"), null);
  assert.equal(safeLink("/meetings/x#brief"), "/meetings/x#brief");
});
