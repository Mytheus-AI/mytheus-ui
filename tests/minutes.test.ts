// Run: npm test
// Minutes for everyone, the UI's pure rules: reading the minutes view, the decision status chips,
// the unavailable copy, polling, guest addresses, the composer, share links and the public page.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DECISION_STATUS,
  MAX_GUESTS,
  addGuests,
  composerPayload,
  composerProblem,
  decisionStatus,
  dispatchSummary,
  dueLabel,
  expiryLabel,
  guestOutcome,
  hasContent,
  isEmail,
  linkState,
  ownerLine,
  plausibleToken,
  publicShareRead,
  recapIsEmpty,
  shareFailure,
  shouldPoll,
  toMinutesView,
  unavailableCopy,
  viewsLabel,
  type MeetingRecap,
} from "../src/components/minutes/minutes-model.ts";

const M = "11111111-1111-4111-8111-111111111111";

const shared = {
  scope: "shared",
  status: "ready",
  reason: null,
  summary: "Agreed the price rise.",
  decisions: [
    { text: "Raise the price by 8%", status: "agreed", decision_id: null },
    { text: "  ", status: "agreed" },
    { text: "Odd status", status: "maybe" },
  ],
  open_items: [{ text: "Confirm the vendor split", owner_name: "Sam", due: "Friday" }],
  unanswered_questions: [{ text: "Does legal review?", asked_by_name: "Ana" }],
  promises: [{ text: "Never on shared", to_name: null, due: null }],
  prompt_version: "minutes@v1",
  created_at: "2026-11-11T10:00:00Z",
  updated_at: "2026-11-11T10:00:00Z",
};

test("toMinutesView reads the view defensively", () => {
  assert.equal(toMinutesView(null), null);
  assert.equal(toMinutesView({ meeting_id: M, state: "weird" }), null);
  const v = toMinutesView({ meeting_id: M, state: "ready", shared, mine: { ...shared, scope: "personal" } });
  assert.ok(v);
  assert.equal(v.state, "ready");
  assert.deepEqual(
    v.shared?.decisions.map((d) => [d.text, d.status]),
    [
      ["Raise the price by 8%", "agreed"],
      ["Odd status", "agreed"],
    ],
  );
  assert.deepEqual(v.shared?.promises, [], "the shared minutes never carry promises");
  assert.equal(v.mine?.promises.length, 1);
  assert.equal(toMinutesView({ meeting_id: M, state: "pending", shared: null, mine: null })?.shared, null);
});

test("hasContent and the status chips", () => {
  const v = toMinutesView({ meeting_id: M, state: "ready", shared });
  assert.equal(hasContent(v?.shared), true);
  assert.equal(hasContent(null), false);
  assert.equal(
    hasContent({ ...v!.shared!, summary: " ", decisions: [], open_items: [], unanswered_questions: [], promises: [] }),
    false,
  );
  assert.equal(hasContent({ ...v!.shared!, status: "empty" }), false);
  assert.deepEqual(decisionStatus("reversed"), DECISION_STATUS.reversed);
  assert.equal(decisionStatus("nope").label, "Noted");
  assert.equal(DECISION_STATUS.agreed.tone, "ok");
  assert.equal(DECISION_STATUS.tentative.tone, "medium");
});

test("unavailable copy and polling", () => {
  assert.match(unavailableCopy("budget").body, /budget/);
  assert.match(unavailableCopy("no_transcript").title, /No minutes/);
  assert.equal(unavailableCopy(null).title, unavailableCopy("model_error").title);
  assert.equal(shouldPoll("pending", 0), true);
  assert.equal(shouldPoll("pending", 16 * 60_000), false);
  assert.equal(shouldPoll("ready", 0), false);
  assert.equal(shouldPoll(null, 0), false);
});

test("guest addresses: split, lowercase, de-duplicate, cap, keep the invalid", () => {
  assert.equal(isEmail("ana@client.com"), true);
  assert.equal(isEmail("ana@client"), false);
  const r = addGuests(["ana@client.com"], "Ana@Client.com, raj@x.io; nope <diego@y.dev>\nsam@z.co");
  assert.deepEqual(r.guests, ["ana@client.com", "raj@x.io", "diego@y.dev", "sam@z.co"]);
  assert.deepEqual(r.invalid, ["nope"]);
  assert.equal(r.overflow, false);
  const full = Array.from({ length: MAX_GUESTS }, (_, i) => `g${i}@x.io`);
  const over = addGuests(full, "one@more.io");
  assert.equal(over.guests.length, MAX_GUESTS);
  assert.equal(over.overflow, true);
});

test("composer: problems and the minimal payload", () => {
  const draft = { subject: "Recap: Pricing", body: "Recap of Pricing\n\nDecisions\n- A" };
  assert.equal(composerProblem({ subject: "", body: "x", guests: [] }), "Add a subject.");
  assert.match(composerProblem({ subject: "s", body: "  ", guests: [] }) ?? "", /message/);
  assert.match(composerProblem({ subject: "s", body: "b", guests: ["bad"] }) ?? "", /not valid/);
  assert.equal(composerProblem({ subject: "s", body: "b", guests: ["a@b.io"] }), null);
  assert.deepEqual(composerPayload({ ...draft, guests: ["a@b.io"] }, draft, ["a@b.io"]), {});
  assert.deepEqual(composerPayload({ ...draft, body: draft.body + "\n\n", guests: [] }, draft, []), {});
  assert.deepEqual(composerPayload({ subject: " New ", body: draft.body, guests: ["c@d.io"] }, draft, ["a@b.io"]), {
    subject: "New",
    guest_emails: ["c@d.io"],
  });
  assert.deepEqual(composerPayload({ subject: "S", body: "B", guests: [] }, null, []), { subject: "S", body: "B" });
});

test("dispatch summary and guest outcomes", () => {
  assert.equal(dispatchSummary(null), null);
  assert.equal(
    dispatchSummary({ status: "sent", participants_notified: 3, waiting_for_minutes: false, guests: [] }),
    "Sent to 3 participants.",
  );
  assert.equal(
    dispatchSummary({
      status: "sent",
      participants_notified: 1,
      waiting_for_minutes: false,
      guests: [
        { recipient: "a@b.io", status: "sent" },
        { recipient: "c@d.io", status: "skipped", detail: "not_configured" },
      ],
    }),
    "Sent to 1 participant and 1 of 2 guests.",
  );
  assert.match(
    dispatchSummary({ status: "unavailable", participants_notified: 0, waiting_for_minutes: true }) ?? "",
    /Waiting for the minutes/,
  );
  assert.match(guestOutcome({ recipient: "x@y.io", status: "skipped", detail: "not_configured" }).label, /not connected/);
  assert.equal(guestOutcome({ recipient: "x@y.io", status: "failed" }).tone, "high");
});

test("share links: state, expiry, views, failures", () => {
  assert.equal(linkState({ state: "active" }).label, "Active");
  assert.equal(linkState({ state: "revoked" }).label, "Turned off");
  const now = new Date("2026-11-11T00:00:00Z");
  assert.equal(expiryLabel("2026-12-11T00:00:00Z", now), "Expires in 30 days");
  assert.equal(expiryLabel("2026-11-11T12:00:00Z", now), "Expires within a day");
  assert.equal(expiryLabel("2026-11-10T00:00:00Z", now), "Expired");
  assert.equal(viewsLabel(0), "Not opened yet");
  assert.equal(viewsLabel(1), "Opened once");
  assert.equal(viewsLabel(7), "Opened 7 times");
  assert.equal(shareFailure(409, "confidential_confirmation_required", "VERSION_CONFLICT"), "confirm");
  assert.equal(shareFailure(403, "confidential_host_only", "FORBIDDEN_ROLE"), "host_only");
  assert.equal(shareFailure(403, null, "NOT_A_PARTICIPANT"), "not_participant");
  assert.equal(shareFailure(503, "not_configured", "DEPENDENCY_UNAVAILABLE"), "not_configured");
  assert.equal(shareFailure(500, null, "INTERNAL"), "error");
});

test("the public share read and page helpers", () => {
  assert.deepEqual(publicShareRead(410, { reason: "revoked" }), { kind: "gone", reason: "revoked" });
  assert.deepEqual(publicShareRead(410, {}), { kind: "gone", reason: "expired" });
  assert.deepEqual(publicShareRead(404, null), { kind: "not_found" });
  assert.deepEqual(publicShareRead(502, null), { kind: "error" });
  assert.deepEqual(publicShareRead(200, { kind: "other" }), { kind: "error" });
  assert.equal(publicShareRead(200, { kind: "meeting_recap", recap: {} }).kind, "ok");
  assert.equal(plausibleToken("abc"), false);
  assert.equal(plausibleToken("a".repeat(40)), true);
  assert.equal(plausibleToken("../../etc/passwd-xx"), false);
  assert.equal(dueLabel("2026-12-01"), "Dec 1");
  assert.equal(dueLabel("Friday"), "Friday");
  assert.equal(ownerLine("Sam", "2026-12-01"), "Sam, by Dec 1");
  assert.equal(ownerLine(null, null), "");
  const recap = {
    kind: "meeting_recap",
    meeting_id: M,
    title: "T",
    status: "ended",
    participant_names: [],
    agenda: [],
    decisions: [],
    actions: [],
    minutes: null,
  } as unknown as MeetingRecap;
  assert.equal(recapIsEmpty(recap), true);
  assert.equal(
    recapIsEmpty({
      ...recap,
      minutes: { summary: "S", decisions: [], open_items: [], unanswered_questions: [], updated_at: "" },
    }),
    false,
  );
});
