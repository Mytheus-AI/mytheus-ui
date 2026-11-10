// Run: npm test
// The shared candidate ledger (polish program, Phase 0): one confirm, edit or host dismissal
// updates every participant's card; locks; personal hide; the live Decisions and Actions.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SETTLED_MS,
  applyLiveCandidates,
  applyLock,
  applyResolution,
  applyRoomLocks,
  decidedItems,
  emptyCandidatesState,
  expireSettled,
  hideCandidate,
  hydrateCandidates,
  lockedBy,
  orderedCandidates,
  recentSettlements,
  restoreHidden,
  settleLocally,
  type ResolutionPayload,
} from "../src/lib/realtime/candidates.ts";

const D1 = "11111111-1111-5111-8111-111111111111";
const A1 = "33333333-3333-5333-8333-333333333333";
const MAYA = "44444444-4444-4444-8444-444444444444";
const RAJ = "55555555-5555-4555-8555-555555555555";

const withCards = () => {
  let s = applyLiveCandidates(emptyCandidatesState, {
    windowId: "m:0",
    agent: "DecisionAgent",
    kind: "decision_candidate",
    candidates: [{ id: D1, content: "Ship the beta", confidence: 0.9, rationale: "QA ok" }],
  });
  s = applyLiveCandidates(s, {
    windowId: "m:0",
    agent: "ActionAgent",
    kind: "action_candidate",
    candidates: [{ id: A1, content: "Draft notes", confidence: 0.8, due_date: null }],
  });
  return s;
};

const resolution = (over: Partial<ResolutionPayload>): ResolutionPayload => ({
  candidateId: D1,
  kind: "decision",
  outcome: "confirmed",
  byUserId: MAYA,
  at: "2026-11-11T10:00:00Z",
  row: { status: "confirmed", content: "Ship the beta", rationale: "QA ok", confirmedBy: MAYA },
  ...over,
});

test("Maya's confirm clears the card on everyone's screen and joins the live Decisions", () => {
  let s = withCards();
  s = applyResolution(s, resolution({}), 1000);
  assert.deepEqual(orderedCandidates(s).map((c) => c.id), [A1]);
  assert.equal(s.resolved[D1], "confirmed");
  const { decisions } = decidedItems(s);
  assert.deepEqual(decisions.map((d) => [d.id, d.confirmedBy]), [[D1, MAYA]]);
  // "Confirmed by Maya" shows in place, then folds away.
  assert.deepEqual(recentSettlements(s).map((x) => [x.outcome, x.byUserId]), [["confirmed", MAYA]]);
  assert.equal(recentSettlements(expireSettled(s, 1000 + SETTLED_MS)).length, 0);
  // A stale re-hydrate or live repeat never brings the card back.
  s = hydrateCandidates(s, { decisions: [{ id: D1, content: "Ship the beta", confidence: 0.9, status: "proposed" }] });
  assert.deepEqual(orderedCandidates(s).map((c) => c.id), [A1]);
});

test("Raj's edit updates the text in place for everyone and says who edited it", () => {
  let s = withCards();
  s = applyResolution(
    s,
    resolution({
      candidateId: A1,
      kind: "action",
      outcome: "edited",
      byUserId: RAJ,
      row: { status: "proposed", content: "Draft the release notes", dueDate: "2026-11-20", assigneeId: null },
    }),
    0,
  );
  const card = orderedCandidates(s).find((c) => c.id === A1)!;
  assert.equal(card.content, "Draft the release notes");
  assert.equal(card.dueDate, "2026-11-20");
  assert.equal(card.editedBy?.userId, RAJ);
});

test("a host dismissal removes it for everyone; Hide for me only for you", () => {
  let s = withCards();
  s = hideCandidate(s, A1);
  assert.deepEqual(orderedCandidates(s).map((c) => c.id), [D1]);
  assert.ok(s.byId[A1], "hidden for me is not gone for the room");
  s = applyResolution(s, resolution({ outcome: "dismissed", row: { status: "dismissed", content: "Ship the beta" } }), 0);
  assert.equal(orderedCandidates(s).length, 0);
  assert.equal(s.resolved[D1], "dismissed");
  assert.equal(decidedItems(s).decisions.length, 0);
});

test("hidden cards survive a reload through restoreHidden, bad ids ignored", () => {
  const s = restoreHidden(withCards(), [A1, "nope"]);
  assert.deepEqual(Object.keys(s.hidden), [A1]);
});

test("a card is locked while someone else edits it, never for its own editor, and expires", () => {
  let s = withCards();
  s = applyLock(s, { candidateId: D1, byUserId: RAJ, until: 5000 });
  assert.equal(lockedBy(s, D1, MAYA, 1000), RAJ);
  assert.equal(lockedBy(s, D1, RAJ, 1000), null);
  assert.equal(lockedBy(s, D1, MAYA, 6000), null);
  s = applyLock(s, { candidateId: D1, byUserId: null, until: null });
  assert.equal(lockedBy(s, D1, MAYA, 1000), null);
  s = applyRoomLocks(s, [{ candidateId: A1, byUserId: RAJ, until: 9000 }]);
  assert.equal(lockedBy(s, A1, MAYA, 1000), RAJ);
  // A resolution releases the lock too.
  s = applyResolution(s, resolution({ candidateId: A1, kind: "action", outcome: "edited", row: { status: "proposed", content: "x" } }), 0);
  assert.equal(lockedBy(s, A1, MAYA, 1000), null);
});

test("the actor's own screen settles at once, and the room echo does not duplicate it", () => {
  let s = settleLocally(withCards(), D1, "confirmed", MAYA, 500);
  assert.equal(recentSettlements(s).length, 1);
  s = applyResolution(s, resolution({}), 900);
  assert.equal(recentSettlements(s).length, 1);
  assert.equal(recentSettlements(s)[0].seenAt, 500);
  assert.equal(decidedItems(s).decisions[0].confirmedBy, MAYA);
});

test("re-hydrate with include_resolved fills the live Decisions and Actions", () => {
  const s = hydrateCandidates(emptyCandidatesState, {
    decisions: [{ id: D1, content: "Freeze the API", confidence: 0.4, status: "confirmed", confirmed_by: RAJ }],
    actions: [{ id: A1, content: "Draft notes", confidence: 0.9, status: "proposed" }],
  });
  assert.deepEqual(orderedCandidates(s).map((c) => c.id), [A1]);
  assert.deepEqual(decidedItems(s).decisions.map((d) => [d.content, d.confirmedBy]), [["Freeze the API", RAJ]]);
});

test("malformed resolution payloads change nothing", () => {
  const s = withCards();
  assert.equal(applyResolution(s, null, 0), s);
  assert.equal(applyResolution(s, resolution({ candidateId: "x" }), 0), s);
  assert.equal(applyResolution(s, { ...resolution({}), kind: "note" as never }, 0), s);
});
