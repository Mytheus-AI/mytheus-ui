// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyLiveCandidates,
  emptyCandidatesState,
  hydrateCandidates,
  orderedCandidates,
  resolveCandidate,
  type CandidateEventPayload,
} from "../src/lib/realtime/candidates.ts";
import { applyNoteFinal, emptyNotesState, hydrateNotes, orderedNotes } from "../src/lib/realtime/notes.ts";
import { applyLiveSuggestions, emptySuggestionsState, openSuggestions } from "../src/lib/realtime/suggestions.ts";
import {
  momentCards,
  momentHeadline,
  momentLines,
  readMoment,
  windowStartMs,
} from "../src/lib/realtime/moments.ts";

const M = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const MOMENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_MOMENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const D1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const A2 = "33333333-3333-4333-8333-333333333333";
const MAYA = "44444444-4444-4444-8444-444444444444";

const said = {
  moment_id: MOMENT,
  why: "You own the launch date.",
  quote: "Let's ship the beta on the second, and I'll send the deck Friday.",
  speaker_id: MAYA,
  speaker_label: "Maya Chen",
  start_ms: 61_200,
  end_ms: 66_900,
};

function decision(extra: Record<string, unknown> = {}): CandidateEventPayload {
  return {
    windowId: `${M}:60000`,
    agent: "DecisionAgent",
    kind: "decision_candidate",
    candidates: [{ id: D1, content: "Ship the beta on 2 December", confidence: 0.86, rationale: "QA signed off", ...said, ...extra }],
  };
}

function action(id: string, extra: Record<string, unknown> = {}): CandidateEventPayload {
  return {
    windowId: `${M}:60000`,
    agent: "ActionAgent",
    kind: "action_candidate",
    candidates: [{ id, content: "Maya sends the pricing deck", confidence: 0.9, assignee_id: MAYA, due_date: "2026-11-14", ...said, ...extra }],
  };
}

test("a window id carries its start; anything else has none", () => {
  assert.equal(windowStartMs(`${M}:61200`), 61_200);
  assert.equal(windowStartMs("m:x"), null);
  assert.equal(windowStartMs("nope"), null);
  assert.equal(windowStartMs(null), null);
});

test("a moment reads either spelling and falls back to the window's start", () => {
  assert.deepEqual(readMoment(said), {
    momentId: MOMENT,
    why: "You own the launch date.",
    quote: said.quote,
    speakerId: MAYA,
    speakerLabel: "Maya Chen",
    startMs: 61_200,
    endMs: 66_900,
  });
  const camel = readMoment({ momentId: MOMENT, startMs: 5000, speakerLabel: "Raj" });
  assert.equal(camel.momentId, MOMENT);
  assert.equal(camel.startMs, 5000);
  assert.equal(camel.speakerLabel, "Raj");
  const old = readMoment({}, `${M}:30000`);
  assert.equal(old.startMs, 30_000);
  assert.equal(old.quote, null);
  // malformed values are dropped, never trusted
  const bad = readMoment({ moment_id: "x", speaker_id: "user_2", start_ms: -1, end_ms: 3, why: "  " }, "w");
  assert.deepEqual([bad.momentId, bad.speakerId, bad.startMs, bad.why], [null, null, null, null]);
});

test("results sharing a moment become one card, decisions before tasks", () => {
  let s = applyLiveCandidates(emptyCandidatesState, action(A1), 1);
  s = applyLiveCandidates(s, decision(), 2);
  s = applyLiveCandidates(s, action(A2, { moment_id: OTHER_MOMENT, quote: "Raj books the room" }), 3);
  const cards = momentCards(orderedCandidates(s));
  assert.equal(cards.length, 2);
  assert.deepEqual(
    cards[0].parts.map((p) => p.kind),
    ["decision", "action"],
  );
  assert.equal(cards[0].pending, 2);
  assert.equal(cards[0].moment.quote, said.quote);
  assert.equal(momentHeadline(cards[0]), "Decision and task");
  assert.equal(momentHeadline(cards[1]), "Task");
});

test("a candidate without a moment is a card of its own, as before", () => {
  const s = applyLiveCandidates(emptyCandidatesState, {
    windowId: `${M}:30000`,
    agent: "DecisionAgent",
    kind: "decision_candidate",
    candidates: [
      { id: D1, content: "One", confidence: 0.9 },
      { id: A1, content: "Two", confidence: 0.9 },
    ],
  });
  const cards = momentCards(orderedCandidates(s));
  assert.equal(cards.length, 2);
  assert.equal(cards[0].moment.startMs, 30_000);
  assert.equal(cards[0].moment.quote, null);
});

test("an update replaces the card in place, marked updated, never a second card", () => {
  let s = applyLiveCandidates(emptyCandidatesState, decision(), 1);
  s = applyLiveCandidates(s, action(A1), 2);
  const seq = s.byId[D1].seq;
  s = applyLiveCandidates(s, decision({ content: "Ship the beta on 3 December", updates_candidate_id: D1 }), 99);
  const list = orderedCandidates(s);
  assert.equal(list.length, 2);
  assert.equal(s.byId[D1].content, "Ship the beta on 3 December");
  assert.equal(s.byId[D1].seq, seq);
  assert.equal(s.byId[D1].updatedAt, 99);
  assert.equal(momentCards(list)[0].updated, true);
});

test("an update naming another id takes the old card's place and retires the old id", () => {
  const NEW = "55555555-5555-4555-8555-555555555555";
  let s = applyLiveCandidates(emptyCandidatesState, decision(), 1);
  s = applyLiveCandidates(
    s,
    { ...decision(), candidates: [{ id: NEW, content: "Ship on the 3rd", confidence: 0.9, updates_candidate_id: D1, ...said }] },
    5,
  );
  assert.deepEqual(orderedCandidates(s).map((c) => c.id), [NEW]);
  // A stale re-hydrate repeating the old row never brings it back.
  s = hydrateCandidates(s, { decisions: [{ id: D1, content: "Ship the beta on 2 December", confidence: 0.9, status: "proposed" }] });
  assert.deepEqual(orderedCandidates(s).map((c) => c.id), [NEW]);
});

test("an update never resurrects a settled card nor overwrites a person's edit", () => {
  let s = applyLiveCandidates(emptyCandidatesState, decision(), 1);
  s = resolveCandidate(s, D1, "dismissed");
  s = applyLiveCandidates(s, decision({ content: "again", updates_candidate_id: D1 }), 2);
  assert.equal(orderedCandidates(s).length, 0);

  let e = applyLiveCandidates(emptyCandidatesState, decision(), 1);
  e = { ...e, byId: { ...e.byId, [D1]: { ...e.byId[D1], content: "Edited by Raj", editedBy: { userId: MAYA, at: "x" } } } };
  e = applyLiveCandidates(e, decision({ content: "agent wording", updates_candidate_id: D1 }), 2);
  assert.equal(e.byId[D1].content, "Edited by Raj");
  assert.equal(e.byId[D1].updatedAt, 2);
});

test("a re-hydrate fills the moment id and why but never erases the live quote", () => {
  let s = applyLiveCandidates(emptyCandidatesState, decision(), 1);
  s = hydrateCandidates(s, { decisions: [{ id: D1, content: "Ship the beta on 2 December", confidence: 0.9, status: "proposed", moment_id: MOMENT, why: "x" }] });
  assert.equal(s.byId[D1].moment?.quote, said.quote);
  let h = hydrateCandidates(emptyCandidatesState, {
    actions: [{ id: A1, content: "Draft notes", confidence: 0.9, status: "proposed", moment_id: MOMENT, why: "You own it" }],
  });
  assert.equal(h.byId[A1].moment?.momentId, MOMENT);
  assert.equal(h.byId[A1].moment?.why, "You own it");
  // and the live event after the re-hydrate brings the quote in
  h = applyLiveCandidates(h, action(A1), 3);
  assert.equal(h.byId[A1].moment?.quote, said.quote);
  assert.equal(h.byId[A1].moment?.why, "You own it");
});

test("your note and your promise join the card of their moment", () => {
  let s = applyLiveCandidates(emptyCandidatesState, action(A1), 1);
  let n = applyNoteFinal(emptyNotesState, {
    windowId: `${M}:60000`,
    content: "- You send the deck Friday.",
    momentId: MOMENT,
    quote: said.quote,
    startMs: 61_200,
    commitments: [
      { content: "Send the pricing deck", dueHint: "Friday", momentId: MOMENT },
      { content: "   ", dueHint: null },
    ],
  });
  n = applyNoteFinal(n, { windowId: `${M}:90000`, content: "- Unrelated.", momentId: OTHER_MOMENT });
  const cards = momentCards(orderedCandidates(s), orderedNotes(n));
  assert.deepEqual(
    cards[0].parts.map((p) => p.kind),
    ["action", "promise", "note"],
  );
  const promise = cards[0].parts[1];
  assert.ok(promise.kind === "promise" && promise.promise.dueHint === "Friday" && promise.promise.key === `${M}:60000#0`);
  // A note alone never opens a card.
  s = resolveCandidate(s, A1, "confirmed");
  assert.equal(momentCards(orderedCandidates(s), orderedNotes(n)).length, 0);
});

test("a re-hydrated note keeps the moment the live one brought", () => {
  let n = applyNoteFinal(emptyNotesState, { windowId: `${M}:60000`, content: "- x", momentId: MOMENT, quote: "q" });
  n = hydrateNotes(n, [{ windowId: `${M}:60000`, content: "- x" }]);
  assert.equal(orderedNotes(n)[0].moment?.quote, "q");
  const old = hydrateNotes(emptyNotesState, [{ windowId: `${M}:30000`, content: "- y" }]);
  assert.equal(orderedNotes(old)[0].moment?.startMs, 30_000);
});

test("a suggestion carries its moment and why", () => {
  const s = applyLiveSuggestions(emptySuggestionsState, {
    windowId: `${M}:60000`,
    agent: "QuestionAgent",
    kind: "suggestion",
    suggestions: [{ id: D1, question: "Who signs off?", priority: 2, confidence: 0.8, ...said }],
  });
  const [q] = openSuggestions(s);
  assert.equal(q.moment?.why, "You own the launch date.");
  assert.equal(q.moment?.startMs, 61_200);
});

test("the transcript lines a moment points at", () => {
  const lines = [
    { chunkId: "a", startMs: 50_000, endMs: 58_000, isFinal: true },
    { chunkId: "b", startMs: 60_500, endMs: 64_000, isFinal: true },
    { chunkId: "c", startMs: 64_100, endMs: 67_000, isFinal: true },
    { chunkId: "d", startMs: 70_000, endMs: 72_000, isFinal: false },
  ];
  assert.deepEqual(momentLines(lines, 61_200, 66_900), ["b", "c"]);
  assert.deepEqual(momentLines(lines, 61_200), ["b"]);
  assert.deepEqual(momentLines(lines, 49_000), ["a"]);
  assert.deepEqual(momentLines(lines, 200_000), []);
  assert.deepEqual(momentLines([], 1000), []);
  assert.deepEqual(momentLines(lines, null), []);
});
