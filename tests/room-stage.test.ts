// Run: npm test
// The room's top chrome (polish program, Phase 1): the stage bar's model, the catch-up line, the
// wrap-up countdown, when a stand-in's questions come up, and the agenda's multi-row updates.
import assert from "node:assert/strict";
import { test } from "node:test";

import { applyHostAgendaRows, applyServerRows, beginHostStatus, initialAgendaState } from "../src/lib/realtime/agenda.ts";
import {
  applyWrapUp,
  catchUpLine,
  clock,
  dueQuestions,
  initialWrapUp,
  isLateJoin,
  plannedMinutes,
  secondsLeft,
  spokenItemTime,
  stageView,
} from "../src/lib/realtime/stage.ts";
import type { AgendaItem } from "../src/lib/api/meeting-agenda-types.ts";

const I1 = "11111111-1111-4111-8111-111111111111";
const I2 = "22222222-2222-4222-8222-222222222222";
const I3 = "33333333-3333-4333-8333-333333333333";
const T0 = Date.parse("2026-11-11T10:00:00Z");

const item = (id: string, position: number, over: Partial<AgendaItem> = {}): AgendaItem => ({
  id,
  position,
  title: `Item ${position + 1}`,
  owner_user_id: null,
  duration_minutes: 10,
  status: "pending",
  status_source: null,
  agent_note: null,
  updated_at: "2026-11-11T10:00:00Z",
  ...over,
});

test("an empty agenda, one not started, and one done", () => {
  assert.equal(stageView([], T0).phase, "empty");
  const fresh = stageView([item(I2, 1), item(I1, 0)], T0);
  assert.equal(fresh.phase, "not_started");
  assert.equal(fresh.next?.id, I1);
  assert.equal(fresh.number, 1);
  const done = stageView([item(I1, 0, { status: "covered" }), item(I2, 1, { status: "skipped" })], T0);
  assert.equal(done.phase, "done");
  assert.equal(done.done, 2);
});

test("the current item's clock runs from the server's started_at against its extended plan", () => {
  const items = [
    item(I1, 0, { status: "covered" }),
    item(I2, 1, { status: "in_progress", started_at: "2026-11-11T10:00:00Z", extended_minutes: 5, owner_user_id: "u-raj" }),
    item(I3, 2),
  ];
  const at = stageView(items, T0 + 12 * 60_000);
  assert.equal(at.phase, "running");
  assert.equal(at.current?.id, I2);
  assert.equal(at.next?.id, I3);
  assert.equal(at.number, 2);
  assert.equal(at.plannedSeconds, 15 * 60);
  assert.equal(at.elapsedSeconds, 12 * 60);
  assert.equal(at.over, false);
  assert.equal(at.nearlyOver, false);
  assert.equal(stageView(items, T0 + 14.5 * 60_000).nearlyOver, true);
  const late = stageView(items, T0 + 18 * 60_000);
  assert.equal(late.over, true);
  assert.equal(spokenItemTime(late), "3 min over the 15 min planned");
  assert.equal(spokenItemTime(at), "12 min of 15 min planned");
});

test("an item with no start or no plan has no clock, never a made-up one", () => {
  const v = stageView([item(I1, 0, { status: "in_progress", duration_minutes: null })], T0);
  assert.equal(v.elapsedSeconds, null);
  assert.equal(v.plannedSeconds, null);
  assert.equal(v.over, false);
  assert.equal(spokenItemTime(v), "Time on this item not known yet");
  assert.equal(plannedMinutes({ duration_minutes: null, extended_minutes: 5 }), 5);
  assert.equal(plannedMinutes({ duration_minutes: 10 }), 10);
});

test("the next item wraps to an earlier pending one when nothing follows", () => {
  const v = stageView([item(I1, 0), item(I2, 1, { status: "in_progress" })], T0);
  assert.equal(v.next?.id, I1);
});

test("clock formats m:ss and h:mm:ss", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(65), "1:05");
  assert.equal(clock(3725), "1:02:05");
});

test("the late joiner's line counts what happened and names the item in progress", () => {
  assert.equal(
    catchUpLine({ decisionCount: 2, actionCount: 0, agendaDone: 2, agendaTotal: 5, current: { number: 3, title: "Pricing" } }),
    "Since 0:00: 2 decisions, item 3 in progress",
  );
  assert.equal(
    catchUpLine({ decisionCount: 1, actionCount: 1, agendaDone: 0, agendaTotal: 0, current: null }),
    "Since 0:00: 1 decision, 1 task",
  );
  assert.equal(catchUpLine({ decisionCount: 0, actionCount: 0, agendaDone: 0, agendaTotal: 3, current: null }), "Since 0:00: nothing decided yet");
  assert.equal(catchUpLine({ decisionCount: 0, actionCount: 0, agendaDone: 3, agendaTotal: 3, current: null }), "Since 0:00: agenda done");
  assert.equal(isLateJoin("2026-11-11T10:00:00Z", T0 + 60_000), false);
  assert.equal(isLateJoin("2026-11-11T10:00:00Z", T0 + 5 * 60_000), true);
  assert.equal(isLateJoin(null, T0), false);
});

test("the wrap-up deadline is the stored start plus 60 seconds, and a cancel clears it", () => {
  const w = initialWrapUp("2026-11-11T10:30:00Z");
  assert.equal(w?.endsAt, "2026-11-11T10:31:00.000Z");
  assert.equal(initialWrapUp(null), null);
  assert.equal(secondsLeft(w?.endsAt, Date.parse("2026-11-11T10:30:20Z")), 40);
  assert.equal(secondsLeft(w?.endsAt, Date.parse("2026-11-11T10:32:00Z")), 0);
  const live = applyWrapUp(null, { state: "started", startedAt: "2026-11-11T10:30:00Z", endsAt: "2026-11-11T10:31:00.000Z", byUserId: "u-maya" });
  assert.equal(live?.byUserId, "u-maya");
  assert.equal(applyWrapUp(live, { state: "cancelled" }), null);
  assert.equal(applyWrapUp(live, { state: "started", endsAt: "nonsense" }), live);
});

test("a stand-in's questions come up when their item starts, or with the agenda if they own none", () => {
  const items = [item(I1, 0, { owner_user_id: "u-sarah" }), item(I2, 1)];
  const standIns = [
    { userId: "u-sarah", questions: ["Can we move the launch?", " "] },
    { userId: "u-diego", questions: ["Who owns QA?"] },
    { userId: "u-aiko", questions: [] },
  ];
  assert.deepEqual(dueQuestions(items, standIns), []);
  const started = [item(I1, 0, { owner_user_id: "u-sarah", status: "in_progress" }), item(I2, 1)];
  assert.deepEqual(
    dueQuestions(started, standIns).map((d) => [d.userId, d.itemId, d.questions]),
    [
      ["u-sarah", I1, ["Can we move the launch?"]],
      ["u-diego", null, ["Who owns QA?"]],
    ],
  );
  const moved = [item(I1, 0, { owner_user_id: "u-sarah", status: "covered" }), item(I2, 1, { status: "in_progress" })];
  assert.deepEqual(dueQuestions(moved, standIns).map((d) => d.userId), ["u-diego"]);
  assert.deepEqual(dueQuestions([], standIns).map((d) => d.key), ["u-sarah:meeting", "u-diego:meeting"]);
});

test("Start next's rows apply together, live and on the host's own screen", () => {
  const state = initialAgendaState([item(I1, 0, { status: "in_progress" }), item(I2, 1)]);
  const rows = [
    item(I1, 9, { status: "covered", status_source: "host", ended_at: "2026-11-11T10:10:00Z" }),
    item(I2, 9, { status: "in_progress", status_source: "host", started_at: "2026-11-11T10:10:00Z" }),
  ];
  const live = applyHostAgendaRows(state, rows);
  assert.deepEqual(live.items.map((it) => [it.status, it.position]), [["covered", 0], ["in_progress", 1]]);
  assert.equal(live.items[1].started_at, "2026-11-11T10:10:00Z");
  // An older gateway's single `item`, and garbage, are both handled.
  assert.equal(applyHostAgendaRows(state, [undefined]).items, state.items);
  assert.equal(applyHostAgendaRows(state, null), state);

  const mine = applyServerRows(state, [item(I2, 7, { status: "in_progress", extended_minutes: 5 })]);
  assert.equal(mine.items[1].extended_minutes, 5);
  assert.equal(mine.items[1].position, 1);
  // A host mark still in flight keeps its pending attempt.
  const pending = beginHostStatus(state, I1, "covered", 1);
  assert.ok(applyServerRows(pending, [item(I1, 0, { status: "covered" })]).pending[I1]);
});
