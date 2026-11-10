// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { canSubmitSuspend, isFlagKey, opsGate, sortCosts, suspendReducer, type SuspendState } from "../src/lib/ops.ts";

test("ops gate: only an explicit staff:true opens the console", () => {
  assert.equal(opsGate({ ok: true, data: { staff: true } }), "staff");
  assert.equal(opsGate({ ok: true, data: { staff: false } }), "denied");
  assert.equal(opsGate({ ok: true, data: { staff: "true" } }), "denied");
  assert.equal(opsGate({ ok: true, data: {} }), "denied");
  assert.equal(opsGate({ ok: true, data: null }), "denied");
  assert.equal(opsGate({ ok: true, data: [true] }), "denied");
});

test("ops gate: 401/403 deny; outages are unavailable, never staff", () => {
  assert.equal(opsGate({ ok: false, status: 401 }), "denied");
  assert.equal(opsGate({ ok: false, status: 403 }), "denied");
  assert.equal(opsGate({ ok: false, status: 404 }), "unavailable");
  assert.equal(opsGate({ ok: false, status: 503 }), "unavailable");
  assert.equal(opsGate({ ok: false, status: 0 }), "unavailable");
});

const ORG = "11111111-1111-4111-8111-111111111111";

test("suspend needs a confirm step and a reason before it can submit", () => {
  let s: SuspendState = { step: "idle" };
  s = suspendReducer(s, { type: "submit" });
  assert.equal(s.step, "idle", "nothing to submit from idle");
  s = suspendReducer(s, { type: "ask", orgId: ORG, name: "Acme", verb: "suspend" });
  assert.equal(s.step, "confirming");
  assert.equal(canSubmitSuspend(s), false);
  assert.equal(suspendReducer(s, { type: "submit" }).step, "confirming", "no reason, no submit");
  s = suspendReducer(s, { type: "reason", reason: "abuse report #42" });
  assert.equal(canSubmitSuspend(s), true);
  s = suspendReducer(s, { type: "submit" });
  assert.equal(s.step, "submitting");
  assert.equal(suspendReducer(s, { type: "cancel" }).step, "submitting", "cannot cancel mid-call");
  assert.equal(suspendReducer(s, { type: "ask", orgId: ORG, name: "Other", verb: "suspend" }).step, "submitting");
  s = suspendReducer(s, { type: "succeeded", message: "Acme is suspended." });
  assert.deepEqual(s, { step: "done", message: "Acme is suspended." });
});

test("reinstate confirms without a reason; a failure keeps the dialog for a retry", () => {
  let s: SuspendState = suspendReducer({ step: "idle" }, { type: "ask", orgId: ORG, name: "Acme", verb: "reinstate" });
  assert.equal(canSubmitSuspend(s), true);
  s = suspendReducer(s, { type: "submit" });
  s = suspendReducer(s, { type: "failed", message: "nope" });
  assert.equal(s.step, "error");
  assert.equal(canSubmitSuspend(s), true);
  assert.equal(suspendReducer(s, { type: "submit" }).step, "submitting");
  assert.equal(suspendReducer(s, { type: "cancel" }).step, "idle");
});

test("stale results are ignored outside submitting", () => {
  const idle: SuspendState = { step: "idle" };
  assert.equal(suspendReducer(idle, { type: "succeeded", message: "x" }), idle);
  assert.equal(suspendReducer(idle, { type: "failed", message: "x" }), idle);
});

test("costs sort by share of quota, then volume; no quota sorts last", () => {
  const rows = sortCosts([
    { org_id: "a", name: "A", tokens_consumed: 900, token_quota: null },
    { org_id: "b", name: "B", tokens_consumed: 50, token_quota: 100 },
    { org_id: "c", name: "C", tokens_consumed: 90, token_quota: 100 },
    { org_id: "d", name: "D", tokens_consumed: 10, token_quota: 0 },
  ]);
  assert.deepEqual(rows.map((r) => r.org_id), ["c", "b", "a", "d"]);
  assert.equal(rows[0].ratio, 0.9);
  assert.equal(rows[3].ratio, null);
});

test("flag keys", () => {
  assert.equal(isFlagKey("live_notes.v2"), true);
  assert.equal(isFlagKey("Live"), false);
  assert.equal(isFlagKey("a"), false);
  assert.equal(isFlagKey("x y"), false);
});
