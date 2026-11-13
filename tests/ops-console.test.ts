// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { actionLabel, healthSummary, isRegion, isSessionMinutes, niceMax } from "../src/lib/ops.ts";

test("niceMax rounds a chart top up to 1, 2 or 5 times a power of ten", () => {
  assert.equal(niceMax(0), 1);
  assert.equal(niceMax(1), 1);
  assert.equal(niceMax(3), 5);
  assert.equal(niceMax(7), 10);
  assert.equal(niceMax(12), 20);
  assert.equal(niceMax(200), 200);
  assert.equal(niceMax(201), 500);
  assert.equal(niceMax(Number.NaN), 1);
});

test("health: one service down is never averaged away", () => {
  const up = { service: "bff", status: "up" as const, latency_ms: 4 };
  const down = { service: "core-api", status: "down" as const, latency_ms: null };
  assert.deepEqual(healthSummary([up, up, down]), { up: 2, down: 1 });
  assert.deepEqual(healthSummary([]), { up: 0, down: 0 });
});

test("only the three canonical regions and the four session lengths are accepted", () => {
  for (const r of ["us", "eu", "ap"]) assert.ok(isRegion(r));
  for (const r of ["US", "in", "", null, 1]) assert.ok(!isRegion(r));
  for (const m of [15, 30, 45, 60]) assert.ok(isSessionMinutes(m));
  for (const m of [0, 10, 61, 90, "30", null]) assert.ok(!isSessionMinutes(m));
});

test("ops actions read as words, and an unknown action shows as stored", () => {
  assert.equal(actionLabel("support.session.start"), "Started a support session");
  assert.equal(actionLabel("tenant.migrate"), "Requested a move");
  assert.equal(actionLabel("something.new"), "something.new");
});
