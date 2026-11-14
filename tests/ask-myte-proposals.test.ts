// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { CONFIRM_LABEL, KIND_LABEL, inputsToIso, integrationFor, isoToInputs, minutesBetween, normalizeProposal, peopleWords, proposalProblem, proposalSummary } from "../src/lib/ask-myte/proposals.ts";
import { PROPOSAL_KINDS } from "../src/lib/ask-myte/types.ts";
import { applyProposalStates, newAnswer, proposalStatesOf, reduceAnswer } from "../src/lib/ask-myte/reducer.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const D = "33333333-3333-4333-8333-333333333333";

test("every kind has a label and a Confirm verb", () => {
  for (const k of PROPOSAL_KINDS) {
    assert.ok(CONFIRM_LABEL[k], k);
    assert.ok(KIND_LABEL[k], k);
  }
});

test("unknown kinds and broken events are dropped", () => {
  assert.equal(normalizeProposal({ id: "p", kind: "launch_rocket", title: "x" }), null);
  assert.equal(normalizeProposal({ kind: "task", title: "x" }), null);
  assert.equal(normalizeProposal(null), null);
});

test("schedule_meeting: ids are uuids, names stay parallel", () => {
  const p = normalizeProposal({ id: "p1", kind: "schedule_meeting", title: "Pricing review", start: "2026-11-18T10:00:00+05:30", end: "2026-11-18T10:30:00+05:30", attendee_ids: [U1, "bad", U2, U1], attendee_names: ["Maya Chen", "x", ""] });
  assert.ok(p);
  assert.deepEqual(p!.attendee_ids, [U1, U2]);
  assert.deepEqual(p!.attendee_names, ["Maya Chen", ""]);
  assert.equal(proposalSummary(p!, "Asia/Kolkata"), 'Schedule "Pricing review", Wed, Nov 18, 10:00 to 10:30 with Maya Chen and 1 other');
  assert.equal(proposalProblem(p!), null);
  assert.equal(proposalProblem({ ...p!, end: p!.start }), "The meeting has to end after it starts.");
  assert.equal(minutesBetween(p!.start, p!.end), 30);
});

test("each kind's summary, problem and integration", () => {
  const slack = normalizeProposal({ id: "s", kind: "slack_post", title: "Post", text: "Shipping Friday", channel: "##General" })!;
  assert.equal(slack.channel, "#general");
  assert.equal(proposalSummary(slack), "Post to Slack in #general");
  assert.equal(integrationFor(slack), "slack");
  const exp = normalizeProposal({ id: "e", kind: "export_decisions", title: "Export", destination: "confluence", decision_ids: [D] })!;
  assert.equal(proposalSummary(exp), "Export 1 decision to Confluence");
  assert.equal(integrationFor(exp), "confluence");
  assert.equal(proposalProblem({ ...exp, decision_ids: [], meeting_id: null }), "I don't know which decisions to export any more.");
  const share = normalizeProposal({ id: "h", kind: "share_decision", title: "Share: Drop Drive", decision_id: D })!;
  assert.equal(proposalSummary(share), "Make a share link: Drop Drive");
  assert.equal(integrationFor(share), null);
  const ask = normalizeProposal({ id: "a", kind: "ask_myte", title: "Ask", person_id: U1, person_name: "Samar Rihan", question: "Where is pricing?" })!;
  assert.equal(proposalSummary(ask), "Ask Samar Rihan's Myte");
  assert.equal(proposalProblem({ ...ask, question: " " }), "Write the question first.");
  const mem = normalizeProposal({ id: "m", kind: "memory", title: "Remember: x", text: "Prefers tables" })!;
  assert.equal(proposalSummary(mem), "Remember: Prefers tables");
  const inv = normalizeProposal({ id: "i", kind: "invite_people", title: "Invite", meeting_id: D, user_ids: [U1, U2], user_names: ["Raj", "Priya"] })!;
  assert.equal(proposalSummary(inv), "Invite Raj and Priya to the meeting");
});

test("people words", () => {
  assert.equal(peopleWords(["Maya"]), "Maya");
  assert.equal(peopleWords(["Maya", "Raj", "Priya", "Diego"]), "Maya, Raj and 2 others");
  assert.equal(peopleWords(["", ""]), "2 people");
});

test("date and time inputs round trip in the local zone", () => {
  const iso = inputsToIso("2026-11-18", "09:30")!;
  assert.match(iso, /^2026-11-18T09:30:00[+-]\d{2}:\d{2}$/);
  assert.deepEqual(isoToInputs(iso), { date: "2026-11-18", time: "09:30" });
  assert.equal(inputsToIso("bad", "09:30"), null);
  assert.deepEqual(isoToInputs(null), { date: "", time: "" });
});

test("R2: stored states win and are written back, at most 20", () => {
  let a = newAnswer("k", 0);
  a = reduceAnswer(a, { event: "proposal", data: { id: "p1", kind: "task", title: "Ship" } }, 0);
  a = reduceAnswer(a, { event: "proposal", data: { id: "p2", kind: "memory", title: "Remember: x", text: "x" } }, 0);
  const b = applyProposalStates(a, { p1: "confirmed", p2: "nope", ghost: "dismissed" });
  assert.equal(b.proposals[0].status, "confirmed");
  assert.equal(b.proposals[1].status, "open");
  assert.deepEqual(proposalStatesOf(b), { p1: "confirmed" });
  assert.equal(applyProposalStates(a, null), a);
});
