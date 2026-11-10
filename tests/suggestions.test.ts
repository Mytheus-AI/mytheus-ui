// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyLiveSuggestions,
  citationLink,
  cleanCitations,
  emptySuggestionsState,
  hydrateSuggestions,
  openSuggestions,
  resolveSuggestion,
  saveSuggestion,
  savedSuggestions,
} from "../src/lib/realtime/suggestions.ts";

const S1 = "11111111-1111-5111-8111-111111111111";
const S2 = "22222222-2222-5222-8222-222222222222";
const S3 = "33333333-3333-5333-8333-333333333333";
const M1 = "44444444-4444-4444-8444-444444444444";
const M0 = "55555555-5555-4555-8555-555555555555";
const D1 = "66666666-6666-4666-8666-666666666666";

const live = (suggestions: object[]) => ({
  windowId: `${M1}:30000`,
  agent: "QuestionAgent",
  kind: "suggestion",
  suggestions: suggestions as never,
});

test("live suggestions become open cards, most urgent first", () => {
  const s = applyLiveSuggestions(
    emptySuggestionsState,
    live([
      { id: S1, question: "Who signs off?", priority: 3, confidence: 0.8 },
      { id: S2, question: "What is the budget ceiling?", priority: 1, confidence: 0.9, rationale: "You own spend." },
    ]),
  );
  assert.deepEqual(
    openSuggestions(s).map((x) => [x.id, x.priority, x.status]),
    [
      [S2, 1, "open"],
      [S1, 3, "open"],
    ],
  );
  assert.equal(openSuggestions(s)[0].rationale, "You own spend.");
});

test("a malformed suggestion or another agent's record is ignored", () => {
  const bad = applyLiveSuggestions(
    emptySuggestionsState,
    live([
      { id: "nope", question: "x?", priority: 1 },
      { id: S1, question: "  ", priority: 1 },
      { id: S2, question: "Priority four?", priority: 4 },
    ]),
  );
  assert.deepEqual(openSuggestions(bad), []);
  const other = applyLiveSuggestions(emptySuggestionsState, { ...live([{ id: S1, question: "x?", priority: 1 }]), agent: "DecisionAgent" });
  assert.equal(other, emptySuggestionsState);
});

test("live and re-hydrated copies of the same suggestion render once", () => {
  let s = applyLiveSuggestions(emptySuggestionsState, live([{ id: S1, question: "Who signs off?", priority: 2, confidence: 0.8 }]));
  s = hydrateSuggestions(s, {
    open: [{ id: S1, meeting_id: M1, question: "Who signs off?", priority: 2, status: "open", confidence: 0.8 }],
    saved: [],
  });
  assert.equal(openSuggestions(s).length, 1);
});

test("re-hydrate brings back saved suggestions from an earlier meeting", () => {
  const s = hydrateSuggestions(emptySuggestionsState, {
    open: [{ id: S1, meeting_id: M1, question: "Who signs off?", priority: 2, status: "open" }],
    saved: [{ id: S3, meeting_id: M0, question: "Did legal review the DPA?", priority: 1, status: "saved", citations: [] }],
  });
  assert.deepEqual(openSuggestions(s).map((x) => x.id), [S1]);
  const saved = savedSuggestions(s);
  assert.deepEqual(saved.map((x) => [x.id, x.meetingId]), [[S3, M0]]);
});

test("Save moves a card to Saved for later; a stale re-hydrate does not move it back", () => {
  let s = applyLiveSuggestions(emptySuggestionsState, live([{ id: S1, question: "Who signs off?", priority: 2 }]));
  s = saveSuggestion(s, S1);
  assert.deepEqual(openSuggestions(s), []);
  assert.deepEqual(savedSuggestions(s).map((x) => x.id), [S1]);
  s = hydrateSuggestions(s, { open: [{ id: S1, question: "Who signs off?", priority: 2, status: "open" }] });
  assert.deepEqual(savedSuggestions(s).map((x) => x.id), [S1]);
});

test("the server's saved status wins over a local open copy", () => {
  let s = applyLiveSuggestions(emptySuggestionsState, live([{ id: S1, question: "Who signs off?", priority: 2 }]));
  s = hydrateSuggestions(s, { saved: [{ id: S1, meeting_id: M1, question: "Who signs off?", priority: 2, status: "saved" }] });
  assert.deepEqual(savedSuggestions(s).map((x) => x.id), [S1]);
});

test("asked or dismissed suggestions never come back", () => {
  let s = applyLiveSuggestions(emptySuggestionsState, live([
    { id: S1, question: "Who signs off?", priority: 2 },
    { id: S2, question: "Budget?", priority: 1 },
  ]));
  s = resolveSuggestion(s, S1, "asked");
  s = resolveSuggestion(s, S2, "dismissed");
  s = applyLiveSuggestions(s, live([{ id: S1, question: "Who signs off?", priority: 2 }]));
  s = hydrateSuggestions(s, {
    open: [{ id: S2, question: "Budget?", priority: 1, status: "open" }],
    saved: [{ id: S1, question: "Who signs off?", priority: 2, status: "saved" }],
  });
  assert.deepEqual(openSuggestions(s), []);
  assert.deepEqual(savedSuggestions(s), []);
});

test("citations keep the four known kinds and their known fields", () => {
  const cites = cleanCitations([
    { kind: "transcript", meeting_id: M1, chunk_id: "c1", start_ms: 754000, extra: "x" },
    { kind: "document", document_id: "doc-1", title: "Q3 plan" },
    { kind: "decision", decision_id: D1, meeting_id: M0 },
    { kind: "action", action_id: "a1" },
    { kind: "web", url: "https://example.com" },
    "nope",
  ]);
  assert.deepEqual(cites.map((c) => c.kind), ["transcript", "document", "decision", "action"]);
  assert.equal("extra" in cites[0], false);
});

test("each citation kind links where it should", () => {
  const [transcript, document, decision, action] = cleanCitations([
    { kind: "transcript", meeting_id: M1, start_ms: 754000 },
    { kind: "document", document_id: "doc-1", title: "Q3 plan" },
    { kind: "decision", decision_id: D1, meeting_id: M0, title: "Ship on 2 Dec" },
    { kind: "action", action_id: "a1" },
  ]);
  assert.deepEqual(citationLink(transcript), { label: "Transcript at 12:34", href: `/meetings/${M1}/transcript` });
  assert.deepEqual(citationLink(document), { label: "Q3 plan", href: null });
  assert.deepEqual(citationLink(decision), { label: "Ship on 2 Dec", href: `/meetings/${M0}/decisions/${D1}` });
  assert.deepEqual(citationLink(action, M1), { label: "Action", href: `/meetings/${M1}` });
  assert.deepEqual(citationLink(action), { label: "Action", href: "/work/tasks" });
});

test("an id that is not a UUID never reaches an href", () => {
  const [decision] = cleanCitations([{ kind: "decision", decision_id: "../../admin", meeting_id: "x/y" }]);
  assert.deepEqual(citationLink(decision), { label: "Decision", href: "/decisions" });
});
