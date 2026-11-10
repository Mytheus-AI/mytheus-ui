// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { checklistProgress, checklistSteps, type ChecklistSignals } from "../src/lib/checklist.ts";

const none: ChecklistSignals = { role: false, agent: false, calendar: false, meeting: false, brain: false, isAdmin: false };

test("members get four steps, admins a fifth for the company brain", () => {
  assert.deepEqual(
    checklistSteps(none).map((s) => s.key),
    ["role", "agent", "calendar", "meeting"],
  );
  assert.deepEqual(
    checklistSteps({ ...none, isAdmin: true }).map((s) => s.key),
    ["role", "agent", "calendar", "meeting", "brain"],
  );
});

test("a fresh person starts at the first step with the line at rest", () => {
  const p = checklistProgress(checklistSteps(none));
  assert.deepEqual(p, { done: 0, total: 4, current: "role", visible: true, line: 0 });
});

test("the current step is the first one still to do, and the line runs to the last done", () => {
  const p = checklistProgress(checklistSteps({ ...none, role: true, agent: true }));
  assert.equal(p.current, "calendar");
  assert.equal(p.done, 2);
  assert.equal(p.line, 1 / 3);
});

test("steps can be done out of order", () => {
  const p = checklistProgress(checklistSteps({ ...none, meeting: true }));
  assert.equal(p.current, "role");
  assert.equal(p.line, 1);
});

test("hidden when everything is done", () => {
  const p = checklistProgress(checklistSteps({ role: true, agent: true, calendar: true, meeting: true, brain: true, isAdmin: true }));
  assert.equal(p.visible, false);
  assert.equal(p.current, null);
  assert.equal(p.line, 1);
});

test("a step whose read failed is neither a nag nor done", () => {
  const steps = checklistSteps({ role: true, agent: true, calendar: null, meeting: true, isAdmin: false });
  assert.equal(steps.find((s) => s.key === "calendar")?.state, "unknown");
  const p = checklistProgress(steps);
  assert.equal(p.visible, false);
  assert.equal(p.done, 3);
});

test("an unknown step does not hide a step still to do", () => {
  const p = checklistProgress(checklistSteps({ role: null, agent: false, calendar: true, meeting: true, isAdmin: false }));
  assert.equal(p.visible, true);
  assert.equal(p.current, "agent");
});
