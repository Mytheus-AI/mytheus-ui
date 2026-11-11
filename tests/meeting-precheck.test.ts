// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  askableActions,
  askedSummary,
  buildPrecheckRequest,
  changedMeaningfully,
  hasHints,
  joinNames,
  nonSpaceLength,
  precheckSignature,
  shortDate,
  shouldPrecheck,
} from "../src/lib/meeting-precheck.ts";
import type { MeetingPrecheck } from "../src/lib/api/only-mytheus-types.ts";

const EMPTY: MeetingPrecheck = { already_decided: [], status_updates: [], recent_meetings: [], retrieval: "keyword" };

test("asks only once there are 8 characters that are not spaces", () => {
  assert.equal(nonSpaceLength("a b c", [" d "]), 4);
  assert.equal(shouldPrecheck("Pricing", []), false);
  assert.equal(shouldPrecheck("Pricing", ["Q"]), true);
  assert.equal(shouldPrecheck("   ", ["       "]), false);
  assert.equal(shouldPrecheck("Beta launch", []), true);
});

test("the request is trimmed, clipped and leaves blank rows out", () => {
  const body = buildPrecheckRequest("  Beta   launch ", ["", " Pricing ", "x".repeat(400)], ["u1", "u1", "u2"]);
  assert.equal(body.title, "Beta launch");
  assert.deepEqual(body.agenda.slice(0, 1), ["Pricing"]);
  assert.equal(body.agenda[1].length, 300);
  assert.deepEqual(body.participant_ids, ["u1", "u2"]);
  assert.equal("participant_ids" in buildPrecheckRequest("t", []), false);
  assert.equal(buildPrecheckRequest("t", Array.from({ length: 40 }, (_, i) => `Item ${i}`)).agenda.length, 30);
});

test("the signature ignores case and spacing", () => {
  assert.equal(precheckSignature("Beta  Launch", [" Pricing", ""]), precheckSignature("beta launch", ["pricing"]));
  assert.notEqual(precheckSignature("Beta launch", []), precheckSignature("Beta launch", ["Pricing"]));
});

test("a dismissed hint returns only after a meaningful change", () => {
  const before = precheckSignature("Beta launch review", ["Pricing"]);
  assert.equal(changedMeaningfully(before, before), false);
  assert.equal(changedMeaningfully(before, precheckSignature("Beta launch reviews", ["Pricing"])), false);
  assert.equal(changedMeaningfully(before, precheckSignature("Beta launch review", ["Pricing", "Hiring plan"])), true);
  assert.equal(changedMeaningfully(before, precheckSignature("Offsite", [])), true);
});

test("hints exist only when there is something to say", () => {
  assert.equal(hasHints(null), false);
  assert.equal(hasHints(EMPTY), false);
  assert.equal(hasHints({ ...EMPTY, status_updates: [{ agenda_index: 0, text: "Raj's update", action: null }] }), false);
  assert.equal(hasHints({ ...EMPTY, recent_meetings: [{ meeting_id: "m", title: "Beta", when: "2026-11-01T10:00:00Z" }] }), true);
});

test("askable actions are unique and have a task", () => {
  const action = (id: string, owner: string) => ({ id, content: "c", owner_user_id: "u", owner_name: owner, due_date: null });
  const r: MeetingPrecheck = {
    ...EMPTY,
    status_updates: [
      { agenda_index: 0, text: "Raj on QA", action: action("a1", "Raj Patel") },
      { agenda_index: 1, text: "Raj on QA again", action: action("a1", "Raj Patel") },
      { agenda_index: 2, text: "Just chat", action: null },
      { agenda_index: 3, text: "Priya on docs", action: action("a2", "Priya Nair") },
    ],
  };
  assert.deepEqual(askableActions(r).map((a) => a.id), ["a1", "a2"]);
});

test("names join the way people say them", () => {
  assert.equal(joinNames([]), "");
  assert.equal(joinNames(["Raj"]), "Raj");
  assert.equal(joinNames(["Raj", "Priya"]), "Raj and Priya");
  assert.equal(joinNames(["Raj", "Priya", "Diego", "Raj"]), "Raj, Priya and Diego");
});

test("what asking did, in one line", () => {
  const item = (owner: string | null, reason: "requested" | "already_pending" | "own_action" | "not_open") => ({
    action_id: "a",
    request_id: reason === "requested" ? "r" : null,
    owner_name: owner,
    reason,
  });
  assert.deepEqual(
    askedSummary({ requested: 3, skipped: 0, items: [item("Raj Patel", "requested"), item("Priya Nair", "requested"), item("Diego Ruiz", "requested")] }),
    { title: "Asked Raj, Priya and Diego", detail: null },
  );
  const mixed = askedSummary({ requested: 1, skipped: 3, items: [item("Raj Patel", "requested"), item("Priya Nair", "already_pending"), item(null, "own_action"), item(null, "not_open")] });
  assert.equal(mixed.title, "Asked Raj");
  assert.equal(mixed.detail, "Priya already has a request waiting. Tasks you own were left out. 1 task is closed or has no owner.");
  assert.equal(askedSummary({ requested: 0, skipped: 1, items: [item("Priya", "already_pending")] }).title, "No new status requests sent");
  assert.equal(askedSummary({ requested: 2, skipped: 0, items: [item(null, "requested"), item(null, "requested")] }).title, "Asked 2 people");
});

test("short dates leave the year off this year", () => {
  const now = new Date(2026, 10, 11);
  assert.equal(shortDate(new Date(2026, 9, 3, 12).toISOString(), now), "Oct 3");
  assert.equal(shortDate(new Date(2025, 9, 3, 12).toISOString(), now), "Oct 3, 2025");
  assert.equal(shortDate("nope", now), "");
});
