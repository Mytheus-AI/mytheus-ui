// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { askCitationHref, askCitationLabel, askCitationMeta, excerpt } from "../src/lib/rag/ask-live.ts";

const M = "11111111-1111-4111-8111-111111111111";
const D = "22222222-2222-4222-8222-222222222222";

test("sources open the meeting transcript, the decision, My work, never a dead link", () => {
  assert.equal(askCitationHref({ n: 1, text: "", kind: "transcript", meeting_id: M }), `/meetings/${M}/transcript`);
  assert.equal(askCitationHref({ n: 1, text: "", kind: "transcript", meeting_id: M, start_ms: 125_900 }), `/meetings/${M}/transcript#t=125`);
  assert.equal(askCitationHref({ n: 1, text: "", kind: "decision", meeting_id: M, decision_id: D }), `/meetings/${M}/decisions/${D}`);
  assert.equal(askCitationHref({ n: 1, text: "", kind: "decision" }), "/decisions");
  assert.equal(askCitationHref({ n: 1, text: "", kind: "action", action_id: D }), "/work/tasks");
  assert.equal(askCitationHref({ n: 1, text: "", kind: "document" }), null);
  assert.equal(askCitationHref({ n: 1, text: "", kind: "transcript", meeting_id: "../../admin" }), null);
  // unknown kinds read as a meeting passage, as bff defaults them
  assert.equal(askCitationHref({ n: 1, text: "", kind: "weird", meeting_id: M }), `/meetings/${M}/transcript`);
});

test("labels say what the source is, and when it is this meeting", () => {
  assert.equal(askCitationLabel({ n: 1, text: "", kind: "transcript", meeting_id: M, meeting_title: "Pricing review" }), "Pricing review");
  assert.equal(askCitationLabel({ n: 1, text: "", kind: "transcript", meeting_id: M }, M), "Earlier in this meeting");
  assert.equal(askCitationLabel({ n: 1, text: "", kind: "transcript" }), "A past meeting");
  assert.equal(askCitationLabel({ n: 1, text: "", kind: "document" }), "Company brain");
  assert.equal(askCitationLabel({ n: 1, text: "", kind: "decision" }), "Confirmed decision");
  assert.equal(askCitationLabel({ n: 1, text: "", kind: "action" }), "Confirmed task");
});

test("the meta line names the speaker, the meeting and the day", () => {
  assert.equal(
    askCitationMeta({ n: 1, text: "", kind: "decision", meeting_title: "Q4 review", occurred_at: "2026-11-04T10:00:00Z", speaker: "Raj" }),
    "Raj, Q4 review, Nov 4",
  );
  assert.equal(askCitationMeta({ n: 1, text: "", kind: "transcript", meeting_title: "Q4 review" }), "");
});

test("excerpts cut on a word", () => {
  assert.equal(excerpt("short text"), "short text");
  const long = "word ".repeat(60);
  const cut = excerpt(long, 40);
  assert.ok(cut.endsWith("...") && cut.length <= 43, cut);
});
