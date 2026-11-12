// Run: npm test
// ADR-0039 Part E, the meeting side: drafted agendas, Send my agent instead, the health card's
// formatting, the screen-read normalisers, the catch-up summary, and the room's new alert and
// nudge types.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DRAFT_SOURCE_LABEL,
  mergeDraftedAgenda,
  retitleRow,
  templateDraft,
  validateAgenda,
  type AgendaDraftRow,
} from "../src/components/meetings/agenda-editor-model.ts";
import {
  ATTENDANCE_MESSAGES,
  attendanceChanged,
  canAddQuestion,
  draftFrom,
  validateAttendance,
} from "../src/components/meetings/attendance-model.ts";
import {
  balanceNote,
  balanceSlices,
  countLabel,
  coveragePercent,
  peopleTime,
  trendBars,
  trendSummary,
} from "../src/components/health/health-format.ts";
import { catchUpLead } from "../src/components/briefs/catch-up-format.ts";
import { toBrief, toDraftedAgenda, toHealth, toActiveGoals, toTemplates } from "../src/lib/api/meeting-brain-normalize.ts";
import type { DraftedAgendaItem, MeetingCatchUp } from "../src/lib/api/meeting-brain-types.ts";
import { applyLiveAlert, decidedHref, emptyAlertsState, hydrateAlerts, orderedAlerts, bannerAlerts } from "../src/lib/realtime/alerts.ts";
import { applyNudge, emptyNudgeState, nudgeTone, proxyNudgeText } from "../src/lib/realtime/agenda.ts";

const ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RAJ = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GOAL = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const M1 = "55555555-5555-4555-8555-555555555555";
const M0 = "66666666-6666-4666-8666-666666666666";
const D0 = "88888888-8888-4888-8888-888888888888";
const A1 = "11111111-1111-5111-8111-111111111111";
const ITEM = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const own = (key: string, title: string): AgendaDraftRow => ({ key, title, ownerId: "", minutes: "" });
const drafted = (title: string, source: DraftedAgendaItem["source"], over: Partial<DraftedAgendaItem> = {}): DraftedAgendaItem => ({
  title,
  owner_user_id: null,
  duration_minutes: null,
  goal_id: null,
  source,
  ...over,
});

/* ---------------------------------------------------------------- drafted agenda merge */

test("a draft goes first, in the server's order, and your own rows are kept after it", () => {
  const rows = [own("a", "Hiring plan"), own("blank", "")];
  const res = mergeDraftedAgenda(rows, [
    drafted("Check-ins", "template", { duration_minutes: 10 }),
    drafted("Pricing page", "unfinished", { owner_user_id: RAJ }),
    drafted("Status: ship the beta", "open_action", { owner_user_id: RAJ, goal_id: GOAL }),
  ]);
  assert.deepEqual(
    res.rows.map((r) => [r.title, r.source ?? "own"]),
    [
      ["Check-ins", "template"],
      ["Pricing page", "unfinished"],
      ["Status: ship the beta", "open_action"],
      ["Hiring plan", "own"],
    ],
  );
  assert.equal(res.added, 3);
  assert.equal(res.dropped, 0);
  assert.equal(res.rows[0].minutes, "10");
  assert.equal(res.rows[2].goalId, GOAL);
});

test("drafting again replaces the earlier draft, never your rows; same titles are not repeated", () => {
  const first = mergeDraftedAgenda([own("a", "Pricing page")], [drafted("Check-ins", "template"), drafted("pricing  PAGE", "unfinished")]);
  assert.deepEqual(first.rows.map((r) => r.title), ["Check-ins", "Pricing page"]);
  const second = mergeDraftedAgenda(first.rows, [drafted("Demo", "template"), drafted("Demo", "unfinished")]);
  assert.deepEqual(second.rows.map((r) => r.title), ["Demo", "Pricing page"]);
});

test("switching meeting type replaces only the type's items", () => {
  const start = mergeDraftedAgenda([], [drafted("Old type item", "template"), drafted("Left open", "unfinished")]).rows;
  const t = { agenda: [{ title: "New type item", duration_minutes: 15 }] };
  const next = mergeDraftedAgenda(start, templateDraft(t), ["template"]);
  assert.deepEqual(next.rows.map((r) => [r.title, r.source]), [
    ["New type item", "template"],
    ["Left open", "unfinished"],
  ]);
  // No type: the type's items leave, the rest stay.
  assert.deepEqual(mergeDraftedAgenda(next.rows, [], ["template"]).rows.map((r) => r.title), ["Left open"]);
});

test("the 20-item cap trims the draft, never your own rows", () => {
  const mine = Array.from({ length: 18 }, (_, i) => own(`o${i}`, `Mine ${i}`));
  const res = mergeDraftedAgenda(mine, [drafted("D1", "template"), drafted("D2", "template"), drafted("D3", "template")]);
  assert.equal(res.rows.length, 20);
  assert.equal(res.added, 2);
  assert.equal(res.dropped, 1);
  assert.equal(res.rows.filter((r) => r.title.startsWith("Mine")).length, 18);
});

test("retitling a drafted row makes it yours; a goal reaches the server row", () => {
  const rows = mergeDraftedAgenda([], [drafted("Check-ins", "template", { goal_id: GOAL })]).rows;
  const edited = retitleRow(rows, rows[0].key, "Quick check-ins");
  assert.equal(edited[0].source, undefined);
  assert.equal(edited[0].goalId, GOAL);
  const v = validateAgenda(edited, [ME]);
  assert.ok(v.ok);
  if (v.ok) assert.deepEqual(v.items[0], { title: "Quick check-ins", owner_user_id: null, duration_minutes: null, goal_id: GOAL });
  assert.equal(DRAFT_SOURCE_LABEL.open_action, "Open action from last time");
});

/* ---------------------------------------------------------------- attendance form */

test("attending yourself needs nothing", () => {
  const v = validateAttendance({ attendance: "live", update: "x".repeat(5000), questions: [] });
  assert.deepEqual(v, { ok: true, body: { attendance: "live" } });
});

test("sending your Myte needs an update or a question; blanks are dropped and text trimmed", () => {
  const empty = validateAttendance({ attendance: "agent", update: "  ", questions: ["", " "] });
  assert.ok(!empty.ok && empty.errors.form === ATTENDANCE_MESSAGES.nothingToCarry);
  const ok = validateAttendance({ attendance: "agent", update: " Beta is on track. ", questions: ["", " When do we launch? "] });
  assert.deepEqual(ok, {
    ok: true,
    body: { attendance: "agent", proxy_update: "Beta is on track.", proxy_questions: ["When do we launch?"] },
  });
  const onlyQ = validateAttendance({ attendance: "agent", update: "", questions: ["Who owns QA?"] });
  assert.ok(onlyQ.ok && onlyQ.body.proxy_update === null);
});

test("limits: update 2000, each question 300, at most 5 questions", () => {
  const long = validateAttendance({ attendance: "agent", update: "x".repeat(2001), questions: [] });
  assert.ok(!long.ok && long.errors.update === ATTENDANCE_MESSAGES.updateTooLong);
  assert.ok(validateAttendance({ attendance: "agent", update: "x".repeat(2000), questions: [] }).ok);
  const q = validateAttendance({ attendance: "agent", update: "ok", questions: ["fine", "y".repeat(301)] });
  assert.ok(!q.ok && q.errors.questions?.[1] === ATTENDANCE_MESSAGES.questionTooLong && !q.errors.questions?.[0]);
  const six = validateAttendance({ attendance: "agent", update: "", questions: ["1", "2", "3", "4", "5", "6"] });
  assert.ok(!six.ok && six.errors.form === ATTENDANCE_MESSAGES.tooManyQuestions);
  assert.equal(canAddQuestion(["1", "2", "3", "4"]), true);
  assert.equal(canAddQuestion(["1", "2", "3", "4", "5"]), false);
});

test("the draft starts from what is saved, and knows when it changed", () => {
  const saved = { attendance: "agent" as const, proxyUpdate: "On track", proxyQuestions: ["Launch date?"] };
  const d = draftFrom(saved);
  assert.deepEqual(d, { attendance: "agent", update: "On track", questions: ["Launch date?"] });
  assert.equal(attendanceChanged(d, saved), false);
  assert.equal(attendanceChanged({ ...d, questions: ["Launch date?", " "] }, saved), false);
  assert.equal(attendanceChanged({ ...d, update: "Slipping" }, saved), true);
  assert.equal(attendanceChanged({ ...d, attendance: "live" }, saved), true);
  assert.deepEqual(draftFrom({ attendance: "live", proxyUpdate: null, proxyQuestions: [] }).questions, [""]);
});

/* ---------------------------------------------------------------- health formatting */

test("coverage is a whole percent, null without an agenda", () => {
  assert.equal(coveragePercent({ covered: 5, total: 7 }), 71);
  assert.equal(coveragePercent({ covered: 0, total: 0 }), null);
  assert.equal(coveragePercent({ covered: 9, total: 7 }), 100);
});

test("people-time reads as minutes under an hour, else hours to one decimal", () => {
  assert.deepEqual(peopleTime(0.75), { value: "45", unit: "people-minutes", spoken: "45 people-minutes" });
  assert.equal(peopleTime(1).unit, "person-hour");
  assert.equal(peopleTime(3.46).value, "3.5");
  assert.equal(peopleTime(4).value, "4");
  assert.equal(peopleTime(-2).value, "0");
  assert.equal(countLabel(0, "decision", "decisions"), "no decisions");
  assert.equal(countLabel(1, "decision", "decisions"), "1 decision");
});

test("talk balance adds up to exactly 100, biggest first, with a gentle note", () => {
  const names: Record<string, string> = { a: "Maya", b: "Raj", c: "Priya" };
  const slices = balanceSlices(
    [
      { user_id: "a", share: 1 / 3 },
      { user_id: "b", share: 1 / 3 },
      { user_id: "c", share: 1 / 3 },
    ],
    (id) => names[id],
  );
  assert.ok(slices);
  assert.equal(slices!.reduce((n, s) => n + s.percent, 0), 100);
  assert.equal(balanceSlices(null, (id) => id), null);
  const lopsided = balanceSlices(
    [
      { user_id: "a", share: 0.7 },
      { user_id: "b", share: 0.27 },
      { user_id: "c", share: 0.03 },
    ],
    (id) => names[id],
  );
  assert.deepEqual(lopsided!.map((s) => [s.name, s.percent]), [["Maya", 70], ["Raj", 27], ["Priya", 3]]);
  assert.equal(balanceNote(lopsided), "Maya did most of the talking, 70% of it.");
  assert.equal(balanceNote(slices), null);
});

test("the trend runs oldest first, marks this meeting, and says where coverage is heading", () => {
  const bars = trendBars(
    [
      { meeting_id: M1, title: "Weekly", scheduled_start: "2026-11-09T10:00:00Z", coverage: 0.8, decisions: 2 },
      { meeting_id: M0, title: "Weekly", scheduled_start: "2026-11-02T10:00:00Z", coverage: 0.5, decisions: 0 },
      { meeting_id: A1, title: "Kickoff", scheduled_start: "2026-10-26T10:00:00Z", coverage: null, decisions: 1 },
    ],
    M1,
  );
  assert.deepEqual(bars.map((b) => [b.date, b.coverage, b.isCurrent]), [
    ["Oct 26", null, false],
    ["Nov 2", 50, false],
    ["Nov 9", 80, true],
  ]);
  assert.equal(trendSummary(bars), "Agenda coverage is up from 50% to 80% over the last 2 meetings.");
  assert.equal(trendSummary(bars.slice(0, 2)), null);
});

/* ---------------------------------------------------------------- normalisers */

test("health reads accept shares as fractions or percents and drop bad rows", () => {
  const h = toHealth({
    duration_minutes: 45,
    people_hours: 3,
    agenda: { covered: 2, total: 5 },
    decisions: 1,
    actions: "x",
    talk_balance: [{ user_id: "a", share: 60 }, { user_id: "b", share: 0.4 }, { share: 1 }],
    async_suggestion: true,
    trend: [{ meeting_id: M1, coverage: 40, decisions: 1 }, { coverage: 1 }],
  });
  assert.ok(h);
  assert.equal(h!.actions, 0);
  assert.deepEqual(h!.talk_balance, [
    { user_id: "a", share: 0.6 },
    { user_id: "b", share: 0.4 },
  ]);
  assert.equal(h!.trend.length, 1);
  assert.equal(h!.trend[0].coverage, 0.4);
  assert.equal(toHealth({ talk_balance: null })!.talk_balance, null);
  assert.equal(toHealth("nope"), null);
});

test("brief, drafts, types and goals are read defensively", () => {
  const b = toBrief({
    meeting: { id: M1, title: "Weekly", scheduled_start: null },
    my_open_actions: [{ id: "x", title: "Ship", latest_status: { text: "Done Friday", answered_at: null } }, { id: "y" }],
    proxies: [{ user_id: RAJ, proxy_update: "On track" }, { user_id: "not-a-uuid" }],
  });
  assert.ok(b);
  assert.equal(b!.my_open_actions.length, 1);
  assert.equal(b!.my_open_actions[0].latest_status?.text, "Done Friday");
  assert.deepEqual(b!.proxies, [{ user_id: RAJ, proxy_update: "On track" }]);
  assert.deepEqual(b!.my_agenda_items, []);
  assert.equal(toBrief({}), null);

  const d = toDraftedAgenda({ items: [{ title: "A", source: "weird", duration_minutes: 999 }, { source: "template" }] });
  assert.deepEqual(d, [{ title: "A", owner_user_id: null, duration_minutes: null, goal_id: null, source: "template" }]);

  const t = toTemplates([{ id: GOAL, name: "Weekly sync", default_duration_minutes: 600, agenda: [{ title: "Wins" }] }]);
  assert.equal(t[0].default_duration_minutes, 30);
  assert.deepEqual(t[0].agenda, [{ title: "Wins", duration_minutes: null }]);

  const g = toActiveGoals({
    items: [
      { id: GOAL, title: "Launch beta", status: "active", position: 2, period: "2026-Q4" },
      { id: RAJ, title: "Old", status: "achieved" },
      { id: ME, title: "First", status: "active", position: 1 },
    ],
  });
  assert.deepEqual(g.map((x) => x.title), ["First", "Launch beta"]);
});

test("the catch-up leads with what you now own", () => {
  const c: MeetingCatchUp = {
    meeting: null,
    agenda: [
      { id: "1", title: "A", owner_user_id: null, status: "covered", agent_note: null },
      { id: "2", title: "B", owner_user_id: null, status: "skipped", agent_note: null },
    ],
    decisions: [{ id: "d", content: "Ship Friday" }],
    assigned_to_me: [{ id: "t", title: "Write the notes", due_date: null }],
    my_notes: [],
    my_questions: [],
  };
  assert.equal(catchUpLead(c), "You now own 1 action. 1 decision was made, and 1 of 2 agenda items were covered.");
  assert.equal(
    catchUpLead({ ...c, assigned_to_me: [], decisions: [], agenda: [] }),
    "Nothing new is yours. No decisions were made.",
  );
});

/* ---------------------------------------------------------------- room: alerts and nudges */

test("an already-decided alert reads the live camelCase decision and is always amber", () => {
  const s = applyLiveAlert(
    emptyAlertsState,
    {
      id: A1,
      meetingId: M1,
      alertType: "already_decided",
      priority: 1,
      title: "This was decided already",
      body: "",
      decisionId: D0,
      decisionContent: "We price per seat.",
      decidedAt: "2026-10-02T10:00:00Z",
      meetingTitle: "Pricing review",
    },
    M1,
  );
  const [a] = orderedAlerts(s);
  assert.equal(a.priority, 2);
  assert.equal(bannerAlerts([a]).length, 0);
  assert.deepEqual(a.decided, {
    decisionId: D0,
    content: "We price per seat.",
    decidedAt: "2026-10-02T10:00:00Z",
    // the live meetingId is the room's, never taken as the decision's meeting
    meetingId: null,
    meetingTitle: "Pricing review",
  });
  assert.equal(decidedHref(a.decided!), "/decisions");

  // The re-hydrated row fills in the decision's meeting, so the link reaches its lineage page.
  const after = hydrateAlerts(s, {
    items: [
      {
        id: A1,
        meeting_id: M1,
        source: "agent_alert",
        alert_type: "already_decided",
        priority: 2,
        title: "This was decided already",
        status: "unread",
        payload: { alert: { decision_id: D0, decision_content: "We price per seat.", meeting_id: M0, meeting_title: "Pricing review" } },
      },
    ],
  });
  const [b] = orderedAlerts(after);
  assert.equal(b.decided?.meetingId, M0);
  assert.equal(decidedHref(b.decided!), `/meetings/${M0}/decisions/${D0}`);
});

test("a topic-watch alert keeps its topic, snippet and meeting title", () => {
  const s = applyLiveAlert(emptyAlertsState, {
    id: A1,
    meetingId: M1,
    alertType: "topic_watch",
    priority: 3,
    title: "Pricing came up",
    topic: "Pricing",
    snippet: "We should revisit the seat price.",
    meetingTitle: "Sales sync",
  });
  const [a] = orderedAlerts(s);
  assert.deepEqual(a.watch, { topic: "Pricing", snippet: "We should revisit the seat price.", meetingTitle: "Sales sync" });
  assert.equal(a.decided, null);
});

test("a proxy-update nudge keeps the whole update and who sent it, and needs an item", () => {
  const long = "u".repeat(1500);
  const s = applyNudge(emptyNudgeState, { id: "n1", type: "proxy_update", itemId: ITEM, content: long, userId: RAJ });
  assert.equal(s.current?.content.length, 1500);
  assert.equal(s.current?.userId, RAJ);
  assert.equal(nudgeTone("proxy_update"), "low");
  assert.equal(applyNudge(emptyNudgeState, { id: "n2", type: "proxy_update", itemId: null, content: "x" }).current, null);
  // Other nudges stay one short line.
  assert.equal(applyNudge(emptyNudgeState, { id: "n3", type: "over_time", itemId: null, content: long }).current?.content.length, 200);

  const items = [{ id: ITEM, owner_user_id: ME }];
  assert.deepEqual(proxyNudgeText(s.current!, items, []), { ownerId: RAJ, text: long });
  // Without userId the item's owner is the person; their saved update stands in for empty text.
  assert.deepEqual(
    proxyNudgeText({ type: "proxy_update", itemId: ITEM, content: "" }, items, [{ userId: ME, update: "On track" }]),
    { ownerId: ME, text: "On track" },
  );
});

test("the brief reads the previous meeting's minutes, mine first, and nothing when empty", () => {
  const me = "11111111-1111-4111-8111-111111111111";
  const b = toBrief({
    meeting: { id: "m1", title: "Weekly", scheduled_start: null },
    my_agenda_items: [],
    my_open_actions: [],
    saved_questions: [],
    proxies: [],
    previous_meeting: { id: "m0", title: "Kickoff" },
    previous_minutes: {
      open_items: [
        { text: "Confirm the vendor split", owner_user_id: me, owner_name: "Sam", due: "Friday", mine: true },
        { text: "  ", owner_user_id: null },
        { text: "Book the venue", owner_user_id: null, owner_name: null, due: null, mine: false },
      ],
      unanswered_questions: ["Does legal review this?", 3],
      my_promises: [{ text: "Send the comparison", to_name: "Ana", due: null }],
    },
  });
  assert.ok(b);
  assert.deepEqual(b.previous_minutes, {
    open_items: [
      { text: "Confirm the vendor split", owner_user_id: me, owner_name: "Sam", due: "Friday", mine: true },
      { text: "Book the venue", owner_user_id: null, owner_name: null, due: null, mine: false },
    ],
    unanswered_questions: ["Does legal review this?"],
    my_promises: [{ text: "Send the comparison", to_name: "Ana", due: null }],
  });
  const none = toBrief({
    meeting: { id: "m1" },
    previous_minutes: { open_items: [], unanswered_questions: [], my_promises: [] },
  });
  assert.equal(none?.previous_minutes, null);
});
