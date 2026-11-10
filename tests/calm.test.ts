// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { heldSuggestions, isUrgent, needsYouQueue, notesByAgenda, type AgendaLike } from "../src/lib/realtime/calm.ts";
import type { Alert } from "../src/lib/realtime/alerts.ts";
import type { Suggestion } from "../src/lib/realtime/suggestions.ts";
import type { MomentCard } from "../src/lib/realtime/moments.ts";
import { emptyMoment } from "../src/lib/realtime/moments.ts";
import type { LiveNote } from "../src/lib/realtime/notes.ts";

const alert = (id: string, priority: 1 | 2 | 3): Alert =>
  ({ id, priority, status: "unread", title: id, body: "", seq: 0 }) as unknown as Alert;
const question = (id: string, priority: 1 | 2 | 3, seq = 0): Suggestion => ({
  id,
  question: id,
  priority,
  confidence: 0.8,
  rationale: null,
  citations: [],
  status: "open",
  seq,
});
const card = (key: string, seq: number): MomentCard => ({ key, moment: emptyMoment, parts: [], updated: false, seq, pending: 1 });

test("the Now slot holds the most important thing; red alerts stay pinned elsewhere", () => {
  const q = needsYouQueue({
    alerts: [alert("red", 1), alert("blue", 3), alert("amber", 2)],
    moments: [card("m1", 0), card("m2", 1)],
    suggestions: [question("info", 3), question("now", 1), question("attn", 2)],
  });
  assert.deepEqual(
    q.map((e) => e.key),
    ["suggestion:now", "alert:amber", "moment:m1", "moment:m2", "suggestion:attn", "alert:blue", "suggestion:info"],
  );
  assert.deepEqual(q.filter(isUrgent).map((e) => e.key), ["suggestion:now", "alert:amber"]);
  assert.deepEqual(needsYouQueue({ alerts: [], moments: [], suggestions: [] }), []);
});

test("suggestions that arrive while you speak wait; nothing waits once you pause", () => {
  const all = [question("a", 2), question("b", 2), question("c", 1)];
  const released = new Set(["a"]);
  assert.deepEqual(
    (({ shown, held }) => [shown.map((s) => s.id), held.map((s) => s.id)])(heldSuggestions(all, released, true)),
    [["a"], ["b", "c"]],
  );
  assert.deepEqual(heldSuggestions(all, released, false).shown.map((s) => s.id), ["a", "b", "c"]);
  assert.deepEqual(heldSuggestions(all, released, false).held, []);
});

const START = "2026-11-11T10:00:00Z";
const at = (min: number) => new Date(Date.parse(START) + min * 60_000).toISOString();
const note = (min: number, text = `at ${min}`): LiveNote => ({ windowId: `m:${min * 60_000}`, text, final: true, lastSeq: -1 });
const item = (id: string, position: number, status: string, updated: number, extra: Partial<AgendaLike> = {}): AgendaLike => ({
  id,
  position,
  title: id,
  status,
  updated_at: at(updated),
  ...extra,
});

test("notes fold under the agenda item they were said in", () => {
  const groups = notesByAgenda(
    [note(2), note(9), note(14), note(21)],
    [item("intro", 0, "covered", 5), item("beta", 1, "covered", 12), item("pricing", 2, "in_progress", 12), item("later", 3, "not_started", 0)],
    START,
  );
  assert.deepEqual(
    groups.map((g) => [g.key, g.current, g.notes.map((n) => n.text)]),
    [
      ["intro", false, ["at 2"]],
      ["beta", false, ["at 9"]],
      ["pricing", true, ["at 14", "at 21"]],
    ],
  );
});

test("the item in progress is listed before its first note; nothing in progress means Other notes", () => {
  const groups = notesByAgenda([note(2)], [item("intro", 0, "covered", 5), item("beta", 1, "in_progress", 5)], START);
  assert.deepEqual(groups.map((g) => [g.key, g.notes.length]), [["intro", 1], ["beta", 0]]);
  const none = notesByAgenda([note(2), note(9)], [item("intro", 0, "covered", 5)], START);
  assert.deepEqual(none.map((g) => [g.key, g.notes.length]), [["intro", 1], ["other", 1]]);
});

test("a known start of the current item wins over the covered stretches", () => {
  const groups = notesByAgenda([note(3), note(6)], [item("a", 0, "covered", 10), item("b", 1, "in_progress", 10, { started_at: at(5) })], START);
  assert.deepEqual(groups.map((g) => [g.key, g.notes.map((n) => n.text)]), [["a", ["at 3"]], ["b", ["at 6"]]]);
});

test("without an agenda or a start, notes are one list", () => {
  assert.deepEqual(notesByAgenda([note(1)], [], START).map((g) => g.key), ["other"]);
  assert.deepEqual(notesByAgenda([note(1)], [item("a", 0, "in_progress", 1)], null).map((g) => g.key), ["other"]);
  assert.deepEqual(notesByAgenda([], [], START), []);
});
