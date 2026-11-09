// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyLiveCandidates,
  emptyCandidatesState,
  hydrateCandidates,
  orderedCandidates,
  resolveCandidate,
  updateCandidate,
} from "../src/lib/realtime/candidates.ts";

const D1 = "11111111-1111-5111-8111-111111111111";
const D2 = "22222222-2222-5222-8222-222222222222";
const A1 = "33333333-3333-5333-8333-333333333333";
const U1 = "44444444-4444-4444-8444-444444444444";

const live = (kind: string, candidates: object[]) => ({
  windowId: "m:30000",
  agent: kind === "decision_candidate" ? "DecisionAgent" : "ActionAgent",
  kind,
  candidates: candidates as never,
});

test("live decision and action candidates become cards in arrival order", () => {
  let s = applyLiveCandidates(emptyCandidatesState, live("decision_candidate", [
    { id: D1, content: "Ship the beta on 2 December", confidence: 0.86, rationale: "QA signed off" },
  ]));
  s = applyLiveCandidates(s, live("action_candidate", [
    { id: A1, content: "Draft the release notes", confidence: 0.8, assignee_id: U1, due_date: "2026-11-20" },
  ]));
  assert.deepEqual(
    orderedCandidates(s).map((c) => [c.kind, c.content, c.rationale ?? c.assigneeId]),
    [
      ["decision", "Ship the beta on 2 December", "QA signed off"],
      ["action", "Draft the release notes", U1],
    ],
  );
});

test("the same candidate from live and from re-hydrate renders once", () => {
  let s = applyLiveCandidates(emptyCandidatesState, live("decision_candidate", [
    { id: D1, content: "Ship the beta", confidence: 0.9 },
  ]));
  s = hydrateCandidates(s, {
    decisions: [
      { id: D1, content: "Ship the beta", confidence: 0.9, status: "proposed" },
      { id: D2, content: "Freeze the API", confidence: 0.8, status: "proposed" },
    ],
  });
  assert.deepEqual(orderedCandidates(s).map((c) => c.id), [D1, D2]);
});

test("a resolved candidate never comes back from either source", () => {
  let s = applyLiveCandidates(emptyCandidatesState, live("decision_candidate", [
    { id: D1, content: "Ship the beta", confidence: 0.9 },
  ]));
  s = resolveCandidate(s, D1, "confirmed");
  s = applyLiveCandidates(s, live("decision_candidate", [{ id: D1, content: "Ship the beta", confidence: 0.9 }]));
  s = hydrateCandidates(s, { decisions: [{ id: D1, content: "Ship the beta", confidence: 0.9, status: "proposed" }] });
  assert.equal(orderedCandidates(s).length, 0);
  assert.equal(s.resolved[D1], "confirmed");
});

test("only proposed rows hydrate; bad ids, empty text and unknown kinds are ignored", () => {
  let s = hydrateCandidates(emptyCandidatesState, {
    decisions: [{ id: D1, content: "Done already", confidence: 0.9, status: "confirmed" }],
    actions: [{ id: "not-a-uuid", content: "x", confidence: 0.9 }],
  });
  s = applyLiveCandidates(s, live("decision_candidate", [{ id: D2, content: "   ", confidence: 0.9 }]));
  s = applyLiveCandidates(s, live("suggestion", [{ id: A1, content: "Ask about QA", confidence: 0.9 }]));
  assert.equal(orderedCandidates(s).length, 0);
});

test("an edit updates the card in place", () => {
  let s = applyLiveCandidates(emptyCandidatesState, live("action_candidate", [
    { id: A1, content: "Draft notes", confidence: 0.8, due_date: null },
  ]));
  s = updateCandidate(s, A1, { content: "Draft the release notes", dueDate: "2026-11-21" });
  const [c] = orderedCandidates(s);
  assert.equal(c.content, "Draft the release notes");
  assert.equal(c.dueDate, "2026-11-21");
});
