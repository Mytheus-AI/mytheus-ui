// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  agendaProgress,
  applyAgentAgenda,
  applyNudge,
  beginHostStatus,
  commitHostStatus,
  dismissNudge,
  emptyAgendaState,
  emptyNudgeState,
  hydrateAgenda,
  initialAgendaState,
  nudgeTone,
  rollbackHostStatus,
} from "../src/lib/realtime/agenda.ts";
import type { AgendaItem } from "../src/lib/api/meeting-agenda-types.ts";

const I1 = "11111111-1111-4111-8111-111111111111";
const I2 = "22222222-2222-4222-8222-222222222222";
const I3 = "33333333-3333-4333-8333-333333333333";

const item = (id: string, position: number, over: Partial<AgendaItem> = {}): AgendaItem => ({
  id,
  position,
  title: `Item ${position + 1}`,
  owner_user_id: null,
  duration_minutes: 10,
  status: "pending",
  status_source: null,
  agent_note: null,
  updated_at: "2026-11-10T10:00:00Z",
  ...over,
});

const base = () => initialAgendaState([item(I2, 1), item(I1, 0), item(I3, 2)]);

test("the initial agenda is ordered by position and marked loaded", () => {
  const s = base();
  assert.deepEqual(s.items.map((i) => i.id), [I1, I2, I3]);
  assert.equal(s.loaded, true);
  assert.equal(initialAgendaState(null).loaded, false);
});

test("agent-agenda moves an item to in progress, then covered, with its note", () => {
  let s = applyAgentAgenda(base(), { itemId: I1, status: "in_progress", note: "Started on the pricing review" });
  assert.equal(s.items[0].status, "in_progress");
  assert.equal(s.items[0].status_source, "agent");
  assert.equal(s.items[0].agent_note, "Started on the pricing review");
  s = applyAgentAgenda(s, { itemId: I1, status: "covered", note: "Agreed on 47.2% margin" });
  assert.equal(s.items[0].status, "covered");
  assert.equal(s.items[0].agent_note, "Agreed on 47.2% margin");
});

test("agent-agenda never regresses an item from covered to in progress", () => {
  let s = applyAgentAgenda(base(), { itemId: I1, status: "covered", note: "Done" });
  const before = s;
  s = applyAgentAgenda(s, { itemId: I1, status: "in_progress", note: "Back again" });
  assert.equal(s, before);
  assert.equal(s.items[0].status, "covered");
});

test("the host wins: an item the host set is never changed by the agent", () => {
  const s0 = initialAgendaState([item(I1, 0, { status: "skipped", status_source: "host" })]);
  const s1 = applyAgentAgenda(s0, { itemId: I1, status: "covered", note: "x" });
  assert.equal(s1, s0);
});

test("agent-agenda ignores bad ids, statuses the agent may not set, and an empty note keeps the old one", () => {
  const s = base();
  assert.equal(applyAgentAgenda(s, { itemId: "nope", status: "covered", note: null }), s);
  assert.equal(applyAgentAgenda(s, { itemId: I1, status: "skipped", note: null }), s);
  assert.equal(applyAgentAgenda(s, null), s);
  const withNote = applyAgentAgenda(s, { itemId: I1, status: "in_progress", note: "first" });
  const blank = applyAgentAgenda(withNote, { itemId: I1, status: "covered", note: "  " });
  assert.equal(blank.items[0].agent_note, "first");
});

test("an update that beats the re-hydrate waits, then applies under the same rules", () => {
  let s = applyAgentAgenda(emptyAgendaState, { itemId: I1, status: "in_progress", note: "early" });
  assert.equal(s.items.length, 0);
  assert.ok(s.early[I1]);
  s = hydrateAgenda(s, [item(I1, 0)]);
  assert.equal(s.items[0].status, "in_progress");
  assert.equal(s.items[0].agent_note, "early");
  assert.deepEqual(s.early, {});

  // ...and an early update is not applied over the host's choice.
  let h = applyAgentAgenda(emptyAgendaState, { itemId: I2, status: "covered", note: "x" });
  h = hydrateAgenda(h, [item(I2, 0, { status: "skipped", status_source: "host" })]);
  assert.equal(h.items[0].status, "skipped");
});

test("re-hydrate takes the server's rows, but keeps an agent covered the server has not caught up on", () => {
  let s = applyAgentAgenda(base(), { itemId: I1, status: "covered", note: "Done live" });
  s = hydrateAgenda(s, [item(I1, 0, { status: "in_progress", status_source: "agent" }), item(I2, 1, { title: "Renamed" })]);
  assert.equal(s.items.length, 2);
  assert.equal(s.items[0].status, "covered");
  assert.equal(s.items[0].agent_note, "Done live");
  assert.equal(s.items[1].title, "Renamed");

  // The host's row on the server always wins.
  const h = hydrateAgenda(s, [item(I1, 0, { status: "pending", status_source: "host" })]);
  assert.equal(h.items[0].status, "pending");
});

test("a failed re-hydrate marks the agenda stale and keeps what is shown", () => {
  const s = hydrateAgenda(base(), null);
  assert.equal(s.stale, true);
  assert.equal(s.items.length, 3);
  assert.equal(hydrateAgenda(s, [item(I1, 0)]).stale, false);
});

test("host override is optimistic and commits to the server's row", () => {
  let s = beginHostStatus(base(), I2, "covered", 1);
  assert.equal(s.items[1].status, "covered");
  assert.equal(s.items[1].status_source, "host");
  // While in flight, the agent cannot touch it.
  assert.equal(applyAgentAgenda(s, { itemId: I2, status: "in_progress", note: "x" }), s);
  s = commitHostStatus(s, I2, 1, item(I2, 7, { status: "covered", status_source: "host", agent_note: "server" }));
  assert.deepEqual(s.pending, {});
  assert.equal(s.items[1].agent_note, "server");
  assert.equal(s.items[1].position, 1, "keeps the local order");
});

test("optimistic rollback puts the item back exactly as it was", () => {
  const s0 = applyAgentAgenda(base(), { itemId: I1, status: "in_progress", note: "agent note" });
  const s1 = beginHostStatus(s0, I1, "skipped", 1);
  const s2 = rollbackHostStatus(s1, I1, 1);
  assert.deepEqual(s2.items[0], s0.items[0]);
  assert.deepEqual(s2.pending, {});
});

test("only the latest attempt settles an item; rollback restores the state before the first", () => {
  const s0 = base();
  let s = beginHostStatus(s0, I1, "covered", 1);
  s = beginHostStatus(s, I1, "skipped", 2);
  // The first attempt's answer arrives late: ignored either way.
  assert.equal(commitHostStatus(s, I1, 1, item(I1, 0, { status: "covered", status_source: "host" })), s);
  assert.equal(rollbackHostStatus(s, I1, 1), s);
  assert.equal(s.items[0].status, "skipped");
  const back = rollbackHostStatus(s, I1, 2);
  assert.deepEqual(back.items[0], s0.items[0]);
});

test("a re-hydrate during a host change keeps the optimistic status until it settles", () => {
  let s = beginHostStatus(base(), I3, "covered", 4);
  s = hydrateAgenda(s, [item(I1, 0), item(I2, 1), item(I3, 2, { status: "pending" })]);
  assert.equal(s.items[2].status, "covered");
  assert.ok(s.pending[I3]);
  s = rollbackHostStatus(s, I3, 4);
  assert.equal(s.items[2].status, "pending");
});

test("progress counts covered and skipped", () => {
  let s = beginHostStatus(base(), I1, "covered", 1);
  s = beginHostStatus(s, I2, "skipped", 2);
  assert.deepEqual(agendaProgress(s.items), { done: 2, total: 3 });
});

test("nudges show one at a time, queue, never repeat, and dismiss to the next", () => {
  let n = applyNudge(emptyNudgeState, { id: "n1", type: "over_time", itemId: I1, content: "Pricing is 4 minutes over." });
  n = applyNudge(n, { id: "n2", type: "off_agenda", itemId: null, content: "The talk moved to hiring." });
  n = applyNudge(n, { id: "n1", type: "over_time", itemId: I1, content: "again" });
  assert.equal(n.current?.id, "n1");
  assert.equal(n.queue.length, 1);
  assert.equal(dismissNudge(n, "n2"), n, "only the one showing can be dismissed");
  n = dismissNudge(n, "n1");
  assert.equal(n.current?.id, "n2");
  n = dismissNudge(n, "n2");
  assert.equal(n.current, null);
  // Seen ids stay seen after dismissal.
  assert.equal(applyNudge(n, { id: "n1", type: "over_time", itemId: null, content: "x" }), n);
});

test("nudges with an unknown type or no content are dropped; tones follow the frozen language", () => {
  assert.equal(applyNudge(emptyNudgeState, { id: "x", type: "loud" as never, itemId: null, content: "x" }), emptyNudgeState);
  assert.equal(applyNudge(emptyNudgeState, { id: "x", type: "unaddressed", itemId: null, content: " " }), emptyNudgeState);
  assert.equal(nudgeTone("over_time"), "medium");
  assert.equal(nudgeTone("off_agenda"), "low");
  assert.equal(nudgeTone("unaddressed"), "low");
});
