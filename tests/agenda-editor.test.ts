// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AGENDA_MESSAGES,
  addRow,
  canAddRow,
  emptyRow,
  moveRow,
  plannedMinutes,
  removeRow,
  rowsFromItems,
  validateAgenda,
  type AgendaDraftRow,
} from "../src/components/meetings/agenda-editor-model.ts";
import { agentDisplayName, agentSeedFor, asPersonality } from "../src/lib/realtime/agent-persona.ts";

const ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RAJ = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STRANGER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const row = (key: string, over: Partial<AgendaDraftRow> = {}): AgendaDraftRow => ({
  key,
  title: `Topic ${key}`,
  ownerId: "",
  minutes: "",
  ...over,
});

test("a valid agenda becomes MeetingCreate items, blanks ignored", () => {
  const v = validateAgenda(
    [row("a", { ownerId: RAJ, minutes: "15" }), emptyRow(), row("b", { title: "  Hiring plan  " })],
    [ME, RAJ],
  );
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(v.items, [
    { title: "Topic a", owner_user_id: RAJ, duration_minutes: 15 },
    { title: "Hiring plan", owner_user_id: null, duration_minutes: null },
  ]);
});

test("existing items keep their id so the server keeps their status", () => {
  const v = validateAgenda([row("x", { id: "11111111-1111-4111-8111-111111111111" })], [ME]);
  assert.ok(v.ok && v.items[0].id === "11111111-1111-4111-8111-111111111111");
});

test("title limits: required and at most 200 characters", () => {
  const missing = validateAgenda([row("a", { title: " ", minutes: "5" })], [ME]);
  assert.ok(!missing.ok && missing.rows.a.title === AGENDA_MESSAGES.titleMissing);
  assert.equal(AGENDA_MESSAGES.titleTooLong, "Keep the title to 200 characters.");
  const long = validateAgenda([row("a", { title: "x".repeat(201) })], [ME]);
  assert.ok(!long.ok && long.rows.a.title === AGENDA_MESSAGES.titleTooLong);
  assert.ok(validateAgenda([row("a", { title: "x".repeat(200) })], [ME]).ok);
});

test("minutes must be a whole number from 1 to 240", () => {
  assert.equal(AGENDA_MESSAGES.minutes, "Minutes must be a whole number from 1 to 240.");
  for (const bad of ["0", "241", "1.5", "-3", "ten"]) {
    const v = validateAgenda([row("a", { minutes: bad })], [ME]);
    assert.ok(!v.ok && v.rows.a.minutes === AGENDA_MESSAGES.minutes, bad);
  }
  for (const good of ["1", "240", " 30 "]) assert.ok(validateAgenda([row("a", { minutes: good })], [ME]).ok, good);
});

test("an owner must be someone in the meeting", () => {
  const v = validateAgenda([row("a", { ownerId: STRANGER })], [ME, RAJ]);
  assert.ok(!v.ok && v.rows.a.owner === AGENDA_MESSAGES.owner);
  assert.equal(v.ok ? "" : v.message, AGENDA_MESSAGES.summary);
});

test("at most 20 items: adding stops at 20 and validation refuses 21", () => {
  let rows: AgendaDraftRow[] = [];
  for (let i = 0; i < 25; i++) rows = addRow(rows);
  assert.equal(rows.length, 20);
  assert.equal(canAddRow(rows), false);
  const many = Array.from({ length: 21 }, (_, i) => row(String(i)));
  const v = validateAgenda(many, [ME]);
  assert.ok(!v.ok && v.message === "An agenda can have at most 20 items.");
});

test("rows move up and down, and remove", () => {
  const rows = [row("a"), row("b"), row("c")];
  assert.deepEqual(moveRow(rows, "b", -1).map((r) => r.key), ["b", "a", "c"]);
  assert.deepEqual(moveRow(rows, "b", 1).map((r) => r.key), ["a", "c", "b"]);
  assert.equal(moveRow(rows, "a", -1), rows);
  assert.equal(moveRow(rows, "c", 1), rows);
  assert.deepEqual(removeRow(rows, "b").map((r) => r.key), ["a", "c"]);
});

test("rows from items keep order, owner and minutes; planned minutes add up", () => {
  const rows = rowsFromItems([
    { id: "i2", position: 1, title: "Two", owner_user_id: null, duration_minutes: null, status: "pending", status_source: null, agent_note: null, updated_at: "" },
    { id: "i1", position: 0, title: "One", owner_user_id: RAJ, duration_minutes: 20, status: "covered", status_source: "agent", agent_note: null, updated_at: "" },
  ]);
  assert.deepEqual(rows.map((r) => [r.id, r.ownerId, r.minutes]), [["i1", RAJ, "20"], ["i2", "", ""]]);
  assert.equal(plannedMinutes([...rows, row("z", { minutes: "15" }), row("y", { minutes: "abc" })]), 35);
});

test("agent persona defaults: name from first name, stable seed from user id, balanced preset", () => {
  assert.equal(agentDisplayName(null, "Maya Patel"), "Maya's agent");
  assert.equal(agentDisplayName("  Juniper ", "Maya Patel"), "Juniper");
  assert.equal(agentDisplayName("", ""), "Their agent");
  const seed = agentSeedFor(null, ME);
  assert.match(seed, /^[a-z0-9]{4,32}$/);
  assert.equal(agentSeedFor(undefined, ME), seed);
  assert.notEqual(agentSeedFor(null, RAJ), seed);
  assert.equal(agentSeedFor("abcd1234", ME), "abcd1234");
  assert.equal(agentSeedFor("Not A Seed!", ME), seed);
  assert.equal(asPersonality("direct"), "direct");
  assert.equal(asPersonality("loud"), "balanced");
});
