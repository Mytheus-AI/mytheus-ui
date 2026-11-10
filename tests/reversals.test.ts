// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkRescope, decisionHref, orderReversals, parseSourceEvent, resolutionOf, reversalIdOf } from "../src/lib/reversals.ts";
import type { DecisionReversal } from "../src/lib/api/only-mytheus-types.ts";

const R = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const A = "11111111-2222-4333-8444-555555555555";

test("parses the three only-Mytheus source events", () => {
  assert.deepEqual(parseSourceEvent(`decision-reversal:${R}`), { kind: "decision-reversal", reversalId: R });
  assert.deepEqual(parseSourceEvent(`promise-drift:${A}:2026-11-14:owner`), {
    kind: "promise-drift",
    actionId: A,
    due: "2026-11-14",
    audience: "owner",
  });
  assert.deepEqual(parseSourceEvent(`promise-drift:${A}:2026-11-14:host`)?.kind, "promise-drift");
  assert.deepEqual(parseSourceEvent(`weekly-digest:${R}`), { kind: "weekly-digest", digestId: R });
});

test("anything else is not one of them", () => {
  for (const v of [null, undefined, 42, "", "decision-reversal:", "decision-reversal:nope", `decision-reversal:${R}:x`, `promise-drift:${A}:soon:owner`, `promise-drift:${A}:2026-11-14:everyone`, `topic-watch:${R}`]) {
    assert.equal(parseSourceEvent(v), null, String(v));
  }
  assert.equal(reversalIdOf(`weekly-digest:${R}`), null);
  assert.equal(reversalIdOf(`decision-reversal:${R.toUpperCase()}`), R);
});

test("a re-scope sends only what changed", () => {
  const original = { content: "Ship the beta to 40 customers", due_date: "2026-11-20" };
  assert.deepEqual(checkRescope({ content: "Ship the beta to 10 customers", dueDate: "2026-11-20" }, original), {
    ok: true,
    body: { resolution: "rescope", content: "Ship the beta to 10 customers" },
  });
  assert.deepEqual(checkRescope({ content: original.content, dueDate: "2026-12-01" }, original), {
    ok: true,
    body: { resolution: "rescope", due_date: "2026-12-01" },
  });
  assert.deepEqual(checkRescope({ content: original.content, dueDate: "" }, original), {
    ok: true,
    body: { resolution: "rescope", due_date: null },
  });
});

test("a re-scope that changes nothing, or is blank, says why", () => {
  const original = { content: "Ship the beta", due_date: null };
  const same = checkRescope({ content: "  Ship   the beta ", dueDate: "" }, original);
  assert.equal(same.ok, false);
  assert.equal(!same.ok && same.field, "form");
  const blank = checkRescope({ content: "   ", dueDate: "" }, original);
  assert.equal(!blank.ok && blank.field, "content");
  const long = checkRescope({ content: "x".repeat(2001), dueDate: "" }, original);
  assert.equal(!long.ok && long.field, "content");
  const bad = checkRescope({ content: "Ship it", dueDate: "next week" }, original);
  assert.equal(!bad.ok && bad.field, "due_date");
});

test("statuses map back to the resolution that made them", () => {
  assert.equal(resolutionOf("kept"), "keep");
  assert.equal(resolutionOf("rescoped"), "rescope");
  assert.equal(resolutionOf("closed"), "close");
  assert.equal(resolutionOf("pending"), null);
  assert.equal(decisionHref({ id: "d", meeting_id: "m" }), "/meetings/m/decisions/d");
});

test("pending reversals come first, newest first within each", () => {
  const row = (id: string, status: DecisionReversal["status"], created_at: string) => ({ id, status, created_at }) as DecisionReversal;
  const out = orderReversals([
    row("a", "kept", "2026-11-10T10:00:00Z"),
    row("b", "pending", "2026-11-09T10:00:00Z"),
    row("c", "pending", "2026-11-11T10:00:00Z"),
  ]);
  assert.deepEqual(out.map((r) => r.id), ["c", "b", "a"]);
});
