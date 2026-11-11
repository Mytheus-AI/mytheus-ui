// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  RECIPIENT_ALL,
  RECIPIENT_NONE,
  addDays,
  capacitySegments,
  channelCounts,
  dayWord,
  dueGroupKey,
  dueText,
  filterLedger,
  groupByDue,
  isIsoDate,
  keptPromises,
  pendingReview,
  recipientOptions,
  shortDay,
  weekStart,
  weekSummary,
  type Capacity,
  type LedgerPromise,
} from "../src/lib/promises/ledger.ts";
import { describeNotification, promiseLedgerNotice } from "../src/components/notifications/alert-copy.ts";

const WED = "2026-11-11";

const p = (over: Partial<LedgerPromise>): LedgerPromise => ({
  id: "p",
  content: "Send the deck",
  status: "open",
  review_state: "confirmed",
  channel: "meeting",
  due_at: null,
  due_hint: null,
  recipient_user_id: null,
  recipient_name: null,
  source: { channel: "meeting", label: "Pricing review", link: "/meetings/m", external: false, quote: null, at: null },
  meeting_id: "m",
  moment_id: null,
  action_item_id: null,
  confidence: null,
  handed_off_to: null,
  handed_off_to_name: null,
  handed_off_from: null,
  created_at: "2026-11-10T09:00:00Z",
  updated_at: "2026-11-10T09:00:00Z",
  done_at: null,
  pending_proposal: null,
  ...over,
});

test("dates: words, late, week start and validation", () => {
  assert.equal(dayWord(WED, WED), "today");
  assert.equal(dayWord("2026-11-12", WED), "tomorrow");
  assert.equal(dayWord("2026-11-13", WED), "Friday");
  assert.equal(dayWord("2026-11-23", WED), "Mon 23 Nov");
  assert.equal(dueText("2026-11-13", WED), "Due Friday");
  assert.equal(dueText("2026-11-10", WED), "1 day late");
  assert.equal(dueText("2026-11-01", WED), "10 days late");
  assert.equal(weekStart(WED), "2026-11-09");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(shortDay("2026-11-13"), "Fri 13 Nov");
  assert.ok(isIsoDate("2026-02-28") && !isIsoDate("2026-02-30") && !isIsoDate("13/11/2026"));
});

test("groupByDue: overdue to later, then no date; pending and closed stay out", () => {
  const items = [
    p({ id: "late", due_at: "2026-11-09" }),
    p({ id: "today", due_at: WED }),
    p({ id: "tmrw", due_at: "2026-11-12" }),
    p({ id: "fri", due_at: "2026-11-13" }),
    p({ id: "sun", due_at: "2026-11-15" }),
    p({ id: "next", due_at: "2026-11-18" }),
    p({ id: "later", due_at: "2026-12-01" }),
    p({ id: "nodate" }),
    p({ id: "pending", review_state: "pending", due_at: WED }),
    p({ id: "kept", status: "done", due_at: WED }),
  ];
  const groups = groupByDue(items, WED);
  assert.deepEqual(
    groups.map((g) => [g.key, g.items.map((i) => i.id)]),
    [
      ["overdue", ["late"]],
      ["today", ["today"]],
      ["tomorrow", ["tmrw"]],
      ["this_week", ["fri", "sun"]],
      ["next_week", ["next"]],
      ["later", ["later"]],
      ["undated", ["nodate"]],
    ],
  );
  assert.equal(dueGroupKey("2026-11-16", WED), "next_week");
  assert.deepEqual(pendingReview(items).map((i) => i.id), ["pending"]);
  assert.deepEqual(keptPromises(items).map((i) => i.id), ["kept"]);
});

test("filters by channel and recipient, and lists recipients by how much is promised", () => {
  const items = [
    p({ id: "a", channel: "slack", recipient_user_id: "u-sam", recipient_name: "Sam Lee" }),
    p({ id: "b", channel: "meeting", recipient_user_id: "u-sam", recipient_name: "Sam Lee" }),
    p({ id: "c", channel: "manual", recipient_name: "Acme" }),
    p({ id: "d", channel: "manual" }),
    p({ id: "e", channel: "email", status: "done", recipient_name: "Ignored" }),
  ];
  assert.deepEqual(filterLedger(items, { channels: ["slack"], recipient: RECIPIENT_ALL }).map((i) => i.id), ["a"]);
  assert.deepEqual(filterLedger(items, { channels: [], recipient: "u-sam" }).map((i) => i.id), ["a", "b"]);
  assert.deepEqual(filterLedger(items, { channels: [], recipient: "label:acme" }).map((i) => i.id), ["c"]);
  assert.deepEqual(filterLedger(items, { channels: ["manual"], recipient: RECIPIENT_NONE }).map((i) => i.id), ["d"]);
  assert.deepEqual(recipientOptions(items), [
    { value: "u-sam", label: "Sam Lee", count: 2 },
    { value: "label:acme", label: "Acme", count: 1 },
    { value: RECIPIENT_NONE, label: "No one named", count: 1 },
  ]);
  assert.deepEqual(channelCounts(items), { meeting: 1, in_person: 0, slack: 1, email: 0, manual: 2 });
});

const cap = (days: Partial<Capacity["days"][number]>[]): Capacity => ({
  start: "2026-11-09",
  today: WED,
  tz: "UTC",
  workday_minutes: 480,
  item_minutes: 60,
  overdue: 0,
  undated: 0,
  calendar_synced: false,
  days: days.map((d, i) => ({
    date: addDays("2026-11-09", i),
    label: "",
    promises: 0,
    actions: 0,
    items: 0,
    meeting_minutes: 0,
    focus_minutes: 0,
    away: false,
    load_minutes: 0,
    capacity_minutes: i >= 5 ? 0 : 480,
    level: i >= 5 ? "off" : "ok",
    ...d,
  })),
});

test("the week bar: workdays, a weekend only when something is on it, fills and words", () => {
  const week = cap([
    {},
    { items: 1, load_minutes: 60 },
    { items: 2, meeting_minutes: 240, load_minutes: 360, level: "tight" },
    {},
    { items: 7, load_minutes: 420, level: "over" },
    { items: 1, level: "over", load_minutes: 60 },
    {},
  ]);
  const segs = capacitySegments(week, WED);
  assert.deepEqual(segs.map((s) => s.short), ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  assert.equal(segs[2].isToday, true);
  assert.equal(segs[2].fill, 0.75);
  assert.equal(segs[2].meetingFill, 0.5);
  assert.equal(segs[4].fill, 1);
  assert.equal(segs[1].isPast, true);
  assert.equal(segs[2].description, "Today: 2 things due, 4 h of meetings. Tight.");
  assert.equal(weekSummary(week, WED), "Friday is too full: 7 things due.");
  assert.equal(weekSummary(cap([{}, {}, {}, {}, {}, {}, {}]), WED), "Nothing due this week yet.");
  assert.equal(
    weekSummary(cap([{}, {}, { items: 4, load_minutes: 240, level: "tight" }, {}, {}, {}, {}]), WED),
    "Today is tight. The rest of the week has room.",
  );
});

test("the ledger's notifications get their own link words and colour", () => {
  assert.equal(promiseLedgerNotice("capacity:action:x:2026-11-13")?.label, "Offer another date");
  assert.equal(promiseLedgerNotice("promise-date:x:asked")?.label, "Answer the request");
  assert.equal(promiseLedgerNotice("promise-date:x:accepted")?.priority, 3);
  assert.equal(promiseLedgerNotice("promise-found:slack:abc")?.label, "Review them");
  assert.equal(promiseLedgerNotice("weekly-digest:x"), null);
  const item = describeNotification({
    id: "n1",
    priority: 3,
    status: "unread",
    created_at: "2026-11-11T09:00:00Z",
    title: "That's your seventh promise due Friday. Offer Monday instead?",
    body: "Send the deck",
    link: "/work/promises?offer=action:x&date=2026-11-16",
    source: "notification",
    payload: { source_event_id: "capacity:action:x:2026-11-13" },
  } as never);
  assert.equal(item.linkLabel, "Offer another date");
  assert.equal(item.priority, 2);
  assert.equal(item.href, "/work/promises?offer=action:x&date=2026-11-16");
});
