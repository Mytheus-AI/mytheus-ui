// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { citationHref, provenance, segmentAnswer } from "../src/lib/rag/answer.ts";

const M = "11111111-1111-4111-8111-111111111111";
const D = "22222222-2222-4222-8222-222222222222";

test("an answer splits into text and citation markers", () => {
  assert.deepEqual(segmentAnswer("Pro is 25 dollars [1]. Launch is Dec 2 [2][1].", 2), [
    { kind: "text", text: "Pro is 25 dollars " },
    { kind: "cite", n: 1 },
    { kind: "text", text: ". Launch is Dec 2 " },
    { kind: "cite", n: 2 },
    { kind: "cite", n: 1 },
    { kind: "text", text: "." },
  ]);
});

test("a marker with no passage behind it is dropped, never rendered as a dead button", () => {
  assert.deepEqual(segmentAnswer("Something [7].", 2), [
    { kind: "text", text: "Something " },
    { kind: "text", text: "." },
  ]);
});

test("citations open the transcript at the second, the decision history, or My Tasks", () => {
  assert.equal(
    citationHref({ kind: "transcript", meeting_id: M, start_ms: 125_900 }),
    `/meetings/${M}/transcript#t=125`,
  );
  assert.equal(
    citationHref({ kind: "decision", meeting_id: M, decision_id: D }),
    `/meetings/${M}/decisions/${D}`,
  );
  assert.equal(citationHref({ kind: "action", action_id: D, meeting_id: M }), "/work/tasks");
  assert.equal(citationHref({ kind: "document", document_id: D, element_id: "el_1" }), null);
});

test("provenance names the meeting, the day and the moment", () => {
  const line = provenance(
    {
      n: 1,
      text: "x",
      rerank_score: 0.9,
      citation: { kind: "transcript", meeting_id: M, start_ms: 754_000 },
      meeting_title: "Pricing review",
      occurred_at: "2026-11-04T10:00:00+00:00",
    },
    "en-US",
  );
  assert.equal(line, "Pricing review, Nov 4, 12:34");
});
