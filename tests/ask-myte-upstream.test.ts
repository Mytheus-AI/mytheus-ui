// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkAskBody, upstreamBody, upstreamError } from "../src/lib/ask-myte/upstream.ts";

const M = "11111111-1111-4111-8111-111111111111";

test("checks the browser's body and drops what it must not send", () => {
  assert.equal(checkAskBody(null).ok, false);
  assert.equal(checkAskBody({ question: "   " }).ok, false);
  assert.equal(checkAskBody({ question: "x".repeat(2001) }).ok, false);
  const r = checkAskBody({
    question: "  What did we decide?  ",
    thread_id: "not-a-uuid",
    scope: { kind: "meeting", meeting_id: M, label: "Weekly" },
    page: { kind: "meeting", id: M, title: "Weekly" },
    history: [{ role: "user", content: "hi" }, { role: "system", content: "x" }, ...Array.from({ length: 20 }, () => ({ role: "myte", content: "a" }))],
    timezone: "Europe/London",
    org_id: "evil",
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.question, "What did we decide?");
  assert.equal(r.value.threadId, null);
  assert.deepEqual(r.value.scope, { kind: "meeting", meeting_id: M, person_id: null, as_of: null });
  assert.equal(r.value.scopeLabel, "Weekly");
  assert.equal(r.value.history.length, 12);
  assert.equal(r.value.timezone, "Europe/London");
  const body = upstreamBody(r.value, { name: "Pip", personality: "friendly", instructions: null }, r.value.history);
  assert.equal(body.want_title, true);
  assert.equal("org_id" in body, false);
  assert.equal(body.timezone, "Europe/London");
  assert.deepEqual(body.page, { kind: "meeting", id: M, title: "Weekly" });
  assert.equal(checkAskBody({ question: "x", timezone: "../../etc" }).ok && (checkAskBody({ question: "x", timezone: "../../etc" }) as { value: { timezone: unknown } }).value.timezone, null);
});

test("upstream failures map to the stream's error reasons", () => {
  assert.equal(upstreamError(401, null).reason, "session");
  assert.equal(upstreamError(429, { detail: "Back on Dec 1" }).message, "Back on Dec 1");
  assert.equal(upstreamError(402, null).reason, "budget");
  assert.equal(upstreamError(503, { reason: "ask_not_connected" }).reason, "not_connected");
  assert.equal(upstreamError(404, null).reason, "not_connected");
  assert.equal(upstreamError(422, { detail: "too long" }).reason, "invalid");
  assert.equal(upstreamError(500, null).reason, "unavailable");
  assert.equal(upstreamError(503, null).reason, "unavailable");
});
