// Run: npm test  (node --test with type stripping)
// My Tasks date logic against real action items, which may have no due date and no priority.
import assert from "node:assert/strict";
import { test } from "node:test";

import { daysUntil, dueInfo, groupOf, sortTasks, type Task } from "../src/components/tasks/dates.ts";

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

function task(id: string, dueDate: string | null, extra: Partial<Task> = {}): Task {
  return {
    id,
    meetingId: "m",
    meetingTitle: "M",
    title: id,
    assignee: "You",
    dueDate,
    priority: null,
    status: "open",
    done: false,
    ...extra,
  };
}

test("groups by due date against the real clock, undated as Later", () => {
  assert.equal(groupOf(task("a", iso(-2))), "overdue");
  assert.equal(groupOf(task("b", iso(0))), "today");
  assert.equal(groupOf(task("c", iso(3))), "week");
  assert.equal(groupOf(task("d", iso(30))), "later");
  assert.equal(groupOf(task("e", null)), "later");
  assert.equal(groupOf(task("f", iso(-2), { done: true })), "done");
});

test("sorts soonest due first and undated last, with or without priority", () => {
  const tasks = [task("undated", null), task("later", iso(9)), task("soon", iso(1)), task("p", iso(9), { priority: "high" })];
  assert.deepEqual(tasks.sort(sortTasks).map((t) => t.id), ["soon", "p", "later", "undated"]);
});

test("an undated task has a readable chip and no day count", () => {
  assert.equal(daysUntil(null), null);
  assert.equal(dueInfo(null, false).label, "No due date");
  assert.equal(dueInfo(iso(-1), false).label, "1 day overdue");
});
