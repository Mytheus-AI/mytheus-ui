// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareInbox,
  countLabel,
  filterInbox,
  inboxCounts,
  sortInbox,
  stepIndex,
  toInboxItems,
  type ReviewInput,
} from "../src/lib/inbox.ts";
import type { FeedItem } from "../src/components/notifications/alert-copy.ts";
import type { StatusRequestView } from "../src/lib/api/personal-types.ts";

const NOW = Date.parse("2026-11-11T10:00:00Z");

const note = (id: string, over: Partial<FeedItem> = {}): FeedItem => ({
  id,
  kind: "reminder",
  priority: 3,
  title: `Note ${id}`,
  body: "",
  quote: null,
  href: null,
  linkLabel: "Open",
  unread: true,
  createdAt: "2026-11-11T09:00:00Z",
  ...over,
});

const update = (id: string, over: Partial<StatusRequestView> = {}): StatusRequestView => ({
  id,
  action_id: "a",
  user_id: "u",
  meeting_id: "m",
  state: "pending",
  status_text: null,
  requested_at: "2026-11-11T08:00:00Z",
  answered_at: null,
  actionTitle: "Ship it",
  meetingTitle: "Weekly",
  meetingStart: "2026-11-12T10:00:00Z",
  ...over,
});

const review = (id: string, over: Partial<ReviewInput> = {}): ReviewInput => ({
  id,
  kind: "action",
  content: "Send the deck",
  meeting_id: "m",
  meeting_title: "Weekly",
  created_at: "2026-11-11T07:00:00Z",
  ...over,
});

test("the three reads merge into one list with unique keys", () => {
  const items = toInboxItems({ notifications: [note("1")], updates: [update("1")], reviews: [review("1")] }, NOW);
  assert.equal(items.length, 3);
  assert.deepEqual(new Set(items.map((i) => i.key)).size, 3);
  assert.deepEqual(items.map((i) => i.kind).sort(), ["notification", "review", "update"]);
});

test("open items come before read ones, then priority, then newest first", () => {
  const items = toInboxItems(
    {
      notifications: [
        note("read-urgent", { unread: false, priority: 1, createdAt: "2026-11-11T09:59:00Z" }),
        note("info-new", { priority: 3, createdAt: "2026-11-11T09:50:00Z" }),
        note("info-old", { priority: 3, createdAt: "2026-11-10T09:50:00Z" }),
        note("urgent", { priority: 1, createdAt: "2026-11-09T09:00:00Z" }),
      ],
      reviews: [review("decision", { kind: "decision" })],
    },
    NOW,
  );
  assert.deepEqual(
    items.map((i) => i.id),
    ["urgent", "decision", "info-new", "info-old", "read-urgent"],
  );
});

test("a status request whose meeting starts within two hours acts now", () => {
  const [soon] = toInboxItems({ updates: [update("s", { meetingStart: "2026-11-11T11:30:00Z" })] }, NOW);
  const [later] = toInboxItems({ updates: [update("l")] }, NOW);
  const [unknown] = toInboxItems({ updates: [update("u", { meetingStart: null })] }, NOW);
  assert.equal(soon.priority, 1);
  assert.equal(later.priority, 2);
  assert.equal(unknown.priority, 2);
});

test("an answered status request is not open", () => {
  const [answered] = toInboxItems({ updates: [update("a", { state: "answered" })] }, NOW);
  assert.equal(answered.open, false);
});

test("proposed decisions need attention, proposed tasks inform", () => {
  const items = toInboxItems({ reviews: [review("t"), review("d", { kind: "decision" })] }, NOW);
  assert.deepEqual(
    items.map((i) => [i.id, i.priority]),
    [
      ["d", 2],
      ["t", 3],
    ],
  );
});

test("filters keep one kind; all keeps everything", () => {
  const items = toInboxItems({ notifications: [note("n")], updates: [update("u")], reviews: [review("r")] }, NOW);
  assert.deepEqual(filterInbox(items, "review").map((i) => i.id), ["r"]);
  assert.deepEqual(filterInbox(items, "updates").map((i) => i.id), ["u"]);
  assert.deepEqual(filterInbox(items, "notifications").map((i) => i.id), ["n"]);
  assert.equal(filterInbox(items, "all").length, 3);
});

test("counts are open items only, per filter", () => {
  const items = toInboxItems(
    {
      notifications: [note("n1"), note("n2", { unread: false })],
      updates: [update("u1"), update("u2", { state: "answered" })],
      reviews: [review("r1"), review("r2")],
    },
    NOW,
  );
  assert.deepEqual(inboxCounts(items), { all: 4, review: 2, updates: 1, notifications: 1 });
});

test("sorting never mutates its input and ties break on the key", () => {
  const items = toInboxItems({ notifications: [note("b"), note("a")] }, NOW);
  const before = items.map((i) => i.id);
  const reversed = sortInbox([...items].reverse());
  assert.deepEqual(items.map((i) => i.id), before);
  assert.deepEqual(reversed.map((i) => i.id), ["a", "b"]);
  assert.equal(compareInbox(items[0], items[0]), 0);
});

test("the sidebar label hides zero and caps at 99+", () => {
  assert.equal(countLabel(0), null);
  assert.equal(countLabel(null), null);
  assert.equal(countLabel(7), "7");
  assert.equal(countLabel(140), "99+");
});

test("j and k stop at the ends", () => {
  assert.equal(stepIndex(-1, 1, 3), 0);
  assert.equal(stepIndex(-1, -1, 3), 2);
  assert.equal(stepIndex(2, 1, 3), 2);
  assert.equal(stepIndex(0, -1, 3), 0);
  assert.equal(stepIndex(1, 1, 3), 2);
  assert.equal(stepIndex(0, 1, 0), -1);
});
