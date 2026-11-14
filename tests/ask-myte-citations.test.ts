// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { sourceHref, sourceKindLabel, sourceLinkLabel, sourceMeta, sourceTitle } from "../src/lib/ask-myte/citations.ts";
import type { Source } from "../src/lib/ask-myte/types.ts";

const M = "11111111-1111-4111-8111-111111111111";
const D = "22222222-2222-4222-8222-222222222222";
const P = "33333333-3333-4333-8333-333333333333";
const s = (over: Partial<Source>): Source => ({ n: 1, kind: "transcript", title: "", text: "", ...over });

test("every kind opens somewhere real, never a dead or unsafe link", () => {
  assert.equal(sourceHref(s({ meeting_id: M, start_ms: 674_500 })), `/meetings/${M}/transcript#t=674`);
  assert.equal(sourceHref(s({ kind: "decision", meeting_id: M, decision_id: D })), `/meetings/${M}/decisions/${D}`);
  assert.equal(sourceHref(s({ kind: "action" })), "/work/tasks");
  assert.equal(sourceHref(s({ kind: "promise" })), "/work/promises");
  assert.equal(sourceHref(s({ kind: "meeting", meeting_id: M })), `/meetings/${M}`);
  assert.equal(sourceHref(s({ kind: "meeting", meeting_id: "../admin" })), "/meetings");
  assert.equal(sourceHref(s({ kind: "person", person_id: P })), `/people/${P}`);
  assert.equal(sourceHref(s({ kind: "person", person_id: "x" })), "/people");
  assert.equal(sourceHref(s({ kind: "notification" })), "/inbox");
  assert.equal(sourceHref(s({ kind: "document" })), null);
  assert.equal(sourceHref(s({ kind: "transcript", meeting_id: "nope" })), null);
});

test("labels, titles and link words", () => {
  assert.equal(sourceKindLabel(s({})), "Transcript");
  assert.equal(sourceKindLabel(s({ kind: "decision" })), "Confirmed decision");
  assert.equal(sourceKindLabel(s({ kind: "decision", status: "superseded" })), "Superseded decision");
  assert.equal(sourceKindLabel(s({ kind: "action" })), "Your task");
  assert.equal(sourceKindLabel(s({ kind: "weird" })), "Transcript");
  assert.equal(sourceTitle(s({ meeting_title: "Weekly sync" })), "Weekly sync");
  assert.equal(sourceTitle(s({ kind: "promise" })), "Your promise");
  assert.equal(sourceLinkLabel(s({ meeting_id: M, start_ms: 65_000 })), "Play from 1:05");
  assert.equal(sourceLinkLabel(s({ kind: "document" })), null);
});

test("meta lines", () => {
  assert.equal(sourceMeta(s({ speaker: "Sushan", start_ms: 674_000, meeting_title: "Feature Update - Backend", title: "Drive" })), "at 11:14, Sushan, Feature Update - Backend");
  assert.equal(sourceMeta(s({ kind: "action", due_date: "2026-11-13" })), "");
  assert.equal(sourceMeta(s({ kind: "promise", due_date: "2026-11-13", meeting_title: "Weekly" })), "Weekly, Due Nov 13");
  assert.equal(sourceMeta(s({ kind: "meeting", occurred_at: "2026-11-12T18:00:00Z" })), "Nov 12");
});
