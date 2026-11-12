// Run: npm test
// In every meeting at once (Beyond the meeting, Layer 3): the pure helpers behind the Listening
// page, the live toast, the Inbox row, the room's chip and views tray, and the settings form.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SeenIds,
  addDays,
  clock,
  dayLabel,
  digestSegments,
  digestText,
  eveningDigestIdOf,
  focusBlockError,
  focusBlockLabel,
  groupWeek,
  heldReasonText,
  interruptionIdOf,
  listeningLabel,
  localDate,
  mergeViews,
  parseInterruption,
  parseListeners,
  preselectPositions,
  responseText,
  rightNowLine,
  ruleSummary,
  savedLabel,
  summarize,
  summaryLine,
  weekLabel,
  withChoice,
} from "../src/lib/listening.ts";
import { describeNotification } from "../src/components/notifications/alert-copy.ts";
import type { StandingPosition, WeekMeeting } from "../src/lib/api/listening-types";

const I = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const M = "99999999-8888-4777-8666-555555555555";

const meeting = (over: Partial<WeekMeeting>): WeekMeeting => ({
  meeting_id: M,
  title: "Weekly status",
  status: "scheduled",
  scheduled_start: "2026-11-10T15:00:00Z",
  scheduled_end: "2026-11-10T15:45:00Z",
  duration_minutes: 45,
  confidential: false,
  recurring: true,
  hosting: false,
  choice: "attend",
  source: "default",
  rule_id: null,
  can_agent_listen: true,
  ...over,
});

test("the week's headline reads like the owner's sentence", () => {
  assert.equal(
    summaryLine({ invited: 40, attend: 12, agent_listens: 28, skip: 0, minutes_saved: 19 * 60, hours_saved: 19 }),
    "This week: attend 12, your Myte listens to 28, saved 19 hours",
  );
  assert.equal(
    summaryLine({ invited: 5, attend: 2, agent_listens: 2, skip: 1, minutes_saved: 75, hours_saved: 1.3 }, "That week"),
    "That week: attend 2, your Myte listens to 2, skip 1, saved 1.5 hours",
  );
  assert.equal(summaryLine({ invited: 0, attend: 0, agent_listens: 0, skip: 0, minutes_saved: 0, hours_saved: 0 }), "This week: no meetings you are invited to.");
  assert.equal(savedLabel(45), "45 minutes");
  assert.equal(savedLabel(60), "1 hour");
  assert.equal(savedLabel(0), "no time");
});

test("summarize recounts after a choice, and only time not attended is saved", () => {
  const week = [meeting({ meeting_id: "a" }), meeting({ meeting_id: "b", choice: "agent_listens" }), meeting({ meeting_id: "c", choice: "skip", duration_minutes: 30 })];
  const s = summarize(week);
  assert.deepEqual([s.invited, s.attend, s.agent_listens, s.skip, s.minutes_saved, s.hours_saved], [3, 1, 1, 1, 75, 1.3]);
  const after = withChoice(week, "a", "skip");
  assert.equal(after[0].choice, "skip");
  assert.equal(after[0].source, "manual");
  assert.equal(summarize(after).minutes_saved, 120);
  // a rule-sourced change keeps the rule id, a manual one drops it
  assert.equal(withChoice([meeting({ meeting_id: "a", rule_id: "r1", source: "rule" })], "a", "skip", "rule")[0].rule_id, "r1");
  assert.equal(withChoice([meeting({ meeting_id: "a", rule_id: "r1", source: "rule" })], "a", "skip")[0].rule_id, null);
});

test("the week groups by the person's local day, Monday first, in start order", () => {
  const ms = [
    meeting({ meeting_id: "late", scheduled_start: "2026-11-10T22:30:00Z" }), // Wednesday in Kolkata
    meeting({ meeting_id: "early", scheduled_start: "2026-11-10T04:00:00Z" }),
    meeting({ meeting_id: "sun", scheduled_start: "2026-11-15T10:00:00Z" }),
  ];
  const days = groupWeek(ms, "2026-11-09", "Asia/Kolkata", "2026-11-11");
  assert.equal(days.length, 7);
  assert.equal(days[0].label, "Monday 9 Nov");
  assert.deepEqual(days[1].meetings.map((m) => m.meeting_id), ["early"]);
  assert.deepEqual(days[2].meetings.map((m) => m.meeting_id), ["late"]);
  assert.equal(days[2].today, true);
  assert.deepEqual(days[6].meetings.map((m) => m.meeting_id), ["sun"]);
  assert.equal(localDate("2026-11-10T22:30:00Z", "UTC"), "2026-11-10");
  assert.equal(addDays("2026-11-09", 7), "2026-11-16");
  assert.equal(weekLabel("2026-11-09", "2026-11-15"), "9 Nov to 15 Nov 2026");
});

test("interruption ids, held reasons and answers in plain words", () => {
  assert.equal(interruptionIdOf(`interrupt:${I}`), I);
  assert.equal(interruptionIdOf(`interrupt:${I}:x`), null);
  assert.equal(interruptionIdOf("interrupt:nope"), null);
  assert.equal(eveningDigestIdOf(`evening-digest:${I}`), I);
  assert.equal(eveningDigestIdOf(`weekly-digest:${I}`), null);
  assert.equal(heldReasonText("focus_block"), "During a focus block");
  assert.equal(heldReasonText("throttled"), "You had enough interruptions for now");
  assert.equal(heldReasonText("weird"), "Held for later");
  assert.equal(responseText("holding_line"), "Your Myte held the line");
  assert.equal(responseText(null), null);
});

test("a live interruption is shown once per tab, whatever the socket replays", () => {
  const seen = new SeenIds(2);
  assert.equal(seen.first("a"), true);
  assert.equal(seen.first("a"), false);
  assert.equal(seen.first("b"), true);
  assert.equal(seen.first("c"), true); // "a" falls off the bounded memory
  assert.equal(seen.first("a"), true);
  assert.equal(seen.first(""), false);
});

test("an agent-interrupt payload is accepted only with what the toast needs, and links stay on site", () => {
  const ok = parseInterruption({
    id: I,
    meeting_id: M,
    title: "Pricing for your segment is being decided in the 3pm right now.",
    reason: "decision",
    join_url: "https://evil.example/room",
    moment_url: `/meetings/${M}/transcript#t=125`,
  });
  assert.ok(ok);
  assert.equal(ok.join_url, `/meetings/${M}/room`);
  assert.equal(ok.moment_url, `/meetings/${M}/transcript#t=125`);
  assert.equal(parseInterruption({ id: I, meeting_id: M, title: "x", reason: "gossip" }), null);
  assert.equal(parseInterruption({ id: "x", meeting_id: M, title: "x", reason: "decision" }), null);
  assert.equal(parseInterruption(null), null);
});

test("holding the line pre-picks the lines on the interruption's topic, at most five", () => {
  const p = (id: string, topic: string | null, text: string): StandingPosition => ({ id, topic, text, created_at: "", updated_at: "" });
  const lines = [
    p("1", "Pricing", "No discount above 10% for SMB without finance."),
    p("2", "Hiring", "No new contractors this quarter."),
    p("3", null, "Our pricing page stays public."),
  ];
  assert.deepEqual(preselectPositions(lines, "pricing", "Pricing for your segment is being decided"), ["1", "3"]);
  assert.deepEqual(preselectPositions(lines, null, null), []);
  const many = Array.from({ length: 8 }, (_, i) => p(String(i), "Pricing", "x"));
  assert.equal(preselectPositions(many, "pricing").length, 5);
});

test("focus blocks are checked and described in words", () => {
  assert.equal(focusBlockError({ days: [0, 1, 2, 3, 4], start: "09:00", end: "11:00" }), null);
  assert.equal(focusBlockError({ days: [], start: "09:00", end: "11:00" }), "Pick at least one day.");
  assert.equal(focusBlockError({ days: [0], start: "11:00", end: "09:00" }), "A focus block ends after it starts.");
  assert.equal(focusBlockError({ days: [0], start: "9", end: "11:00" }), "Use times like 09:00.");
  assert.equal(focusBlockLabel({ days: [4, 0, 1, 2, 3], start: "09:00", end: "11:00" }), "Mon to Fri, 09:00 to 11:00");
  assert.equal(focusBlockLabel({ days: [0, 2], start: "14:00", end: "16:00" }), "Mon, Wed, 14:00 to 16:00");
  assert.equal(clock("08:00"), "8am");
  assert.equal(clock("13:30"), "1:30pm");
  assert.equal(clock("00:00"), "12am");
});

test("the right-now line says who can reach you", () => {
  assert.match(rightNowLine({ interruptible_now: true }), /can interrupt you/);
  assert.equal(rightNowLine({ interruptible_now: false, quiet_reason: "focus_block" }, "11:00"), "Right now interruptions are held until 11:00 (a focus block).");
  assert.match(rightNowLine({ interruptible_now: false, quiet_reason: "disabled" }), /off/);
});

test("the evening digest keeps only on-site links and joins plain text", () => {
  const segs = digestSegments([
    { text: "Your Myte sat in on 1 meeting. " },
    { text: "In " },
    { text: "Pricing review (3pm)", href: `/meetings/${M}` },
    { text: ", decided: " },
    { text: "SMB floor at 15%", href: "javascript:alert(1)" },
    { text: "." },
  ]);
  assert.deepEqual(segs, [
    { text: "Your Myte sat in on 1 meeting. In ", href: null },
    { text: "Pricing review (3pm)", href: `/meetings/${M}` },
    { text: ", decided: SMB floor at 15%.", href: null },
  ]);
  assert.equal(digestText([{ text: "One. " }, { text: "Two", href: "/x" }]), "One. Two");
  assert.equal(dayLabel("2026-11-11"), "Wednesday 11 November");
});

test("rules read as a sentence", () => {
  assert.equal(
    ruleSummary({ choice: "agent_listens", title_contains: "status", recurring_only: true }),
    "Your Myte listens to every recurring meeting with “status” in the title, except ones you host.",
  );
  assert.equal(
    ruleSummary({ choice: "skip", template_id: "t", template_name: "All hands", include_hosted: true }),
    "You skip every meeting of type All hands, including ones you host.",
  );
});

test("room: views upsert by id and a decision is never undone by a replay; the listeners event", () => {
  const v = (id: string, status: string, at: string) => ({ id, status, created_at: at });
  const merged = mergeViews([v("a", "shared", "2026-11-11T10:00:00Z")], [v("a", "pending", "2026-11-11T10:00:00Z"), v("b", "pending", "2026-11-11T09:00:00Z")]);
  assert.deepEqual(
    merged.map((x) => [x.id, x.status]),
    [
      ["b", "pending"],
      ["a", "shared"],
    ],
  );
  assert.deepEqual(parseListeners({ count: 3, userIds: ["u1", 4, "u2"] }), { count: 3, userIds: ["u1", "u2"] });
  assert.equal(parseListeners({ count: -1 }), null);
  assert.equal(listeningLabel(1), "1 Myte listening");
  assert.equal(listeningLabel(3), "3 Mytes listening");
});

test("the Inbox: an interruption acts now, the evening digest informs", () => {
  const base = { id: "n1", meeting_id: null, source: "notification", alert_type: null, body: "Pricing review: “Lock SMB at 15%”", status: "unread", created_at: "2026-11-11T15:02:00Z" };
  const live = describeNotification({
    ...base,
    priority: 1,
    title: "Pricing for your segment is being decided in the 3pm right now.",
    link: `/inbox?interruption=${I}`,
    payload: { source_event_id: `interrupt:${I}` },
  });
  assert.equal(live.kind, "interruption");
  assert.equal(live.priority, 1);
  assert.equal(live.title, "Pricing for your segment is being decided in the 3pm right now.");
  const digest = describeNotification({
    ...base,
    priority: 3,
    title: "What your Myte heard today",
    link: "/meetings/listening?day=2026-11-11",
    payload: { source_event_id: `evening-digest:${I}` },
  });
  assert.equal(digest.kind, "evening_digest");
  assert.equal(digest.href, "/meetings/listening?day=2026-11-11");
});
