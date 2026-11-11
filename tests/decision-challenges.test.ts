// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canDismiss,
  challengedHeading,
  checkAccept,
  checkReason,
  defaultFollowUpDue,
  defaultRevisitStart,
  externalLink,
  localDate,
  localDateTime,
  orderChallenges,
  orderReopenRequests,
  parseFollowEvent,
  placeOf,
  reopenIdOf,
  reopenOutcomeLine,
} from "../src/lib/decision-challenges.ts";
import { describeNotification, type FeedRowInput } from "../src/components/notifications/alert-copy.ts";
import { decisionChecksCopy, normalizeIntegrations, scopeLabel } from "../src/lib/integrations.ts";
import type { DecisionChallenge, ReopenRequest } from "../src/lib/api/decision-challenges-types";

const C = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const R = "11111111-2222-4333-8444-555555555555";

const challenge = (over: Partial<DecisionChallenge>): DecisionChallenge => ({
  id: "c1",
  decision_id: "d1",
  source: "slack",
  place_label: "#pricing",
  link: "https://acme.slack.com/archives/C1/p1",
  quote: "Let's give the team plan away free for a year",
  why: "The pricing review set the team plan at $18 a seat.",
  relation: "contradicts",
  confidence: 0.86,
  status: "open",
  author: { id: "u-raj", name: "Raj Patel" },
  created_at: "2026-11-10T09:00:00Z",
  reopen_request_id: null,
  ...over,
});

const request = (over: Partial<ReopenRequest>): ReopenRequest => ({
  id: R,
  decision_id: "d1",
  decision_content: "Price the team plan at $18 a seat",
  meeting_id: "m1",
  meeting_title: "Pricing review",
  requested_by: { id: "u-raj", name: "Raj Patel" },
  owner: { id: "u-maya", name: "Maya Chen" },
  reason: null,
  quote: null,
  source: "app",
  place_label: null,
  link: null,
  status: "pending",
  outcome: null,
  follow_up_action_id: null,
  revisit_meeting_id: null,
  response_note: null,
  created_at: "2026-11-10T09:00:00Z",
  resolved_at: null,
  viewer_role: "owner",
  ...over,
});

test("source events: the three follow-you jobs, anything else is not ours", () => {
  assert.deepEqual(parseFollowEvent(`decision-challenge:${C}`), { kind: "decision-challenge", challengeId: C });
  assert.deepEqual(parseFollowEvent(`decision-reopen:${R.toUpperCase()}`), { kind: "decision-reopen", requestId: R });
  assert.deepEqual(parseFollowEvent(`decision-reopen-resolved:${R}`), { kind: "decision-reopen-resolved", requestId: R });
  assert.equal(parseFollowEvent(`decision-reversal:${C}`), null);
  assert.equal(parseFollowEvent("decision-reopen:not-a-uuid"), null);
  assert.equal(parseFollowEvent(`decision-reopen:${R}:extra`), null);
  assert.equal(parseFollowEvent(42), null);
  assert.equal(reopenIdOf(`decision-reopen:${R}`), R);
  assert.equal(reopenIdOf(`decision-reopen-resolved:${R}`), R);
  assert.equal(reopenIdOf(`decision-challenge:${C}`), null);
});

test("the heading counts places, never people", () => {
  assert.equal(challengedHeading(3, 5), "Challenged in 3 places");
  assert.equal(challengedHeading(1, 2), "Challenged in 1 place");
  assert.equal(challengedHeading(0, 0), "Challenges");
});

test("place: the server's label, else the source", () => {
  assert.equal(placeOf(challenge({})), "#pricing");
  assert.equal(placeOf(challenge({ place_label: "  ", source: "extension" })), "Browser");
  assert.equal(placeOf(challenge({ place_label: null, source: "mcp" })), "AI assistant");
});

test("only http(s) links leave the app", () => {
  assert.equal(externalLink("https://acme.atlassian.net/browse/PRICE-12"), "https://acme.atlassian.net/browse/PRICE-12");
  assert.equal(externalLink("javascript:alert(1)"), null);
  assert.equal(externalLink("/meetings/x"), null);
  assert.equal(externalLink(null), null);
});

test("open challenges first, dismissed last, newest first inside each", () => {
  const items = [
    challenge({ id: "a", status: "dismissed", created_at: "2026-11-11T00:00:00Z" }),
    challenge({ id: "b", status: "open", created_at: "2026-11-09T00:00:00Z" }),
    challenge({ id: "c", status: "reopened", created_at: "2026-11-11T00:00:00Z" }),
    challenge({ id: "d", status: "open", created_at: "2026-11-10T00:00:00Z" }),
  ];
  assert.deepEqual(orderChallenges(items).map((c) => c.id), ["d", "b", "c", "a"]);
  assert.equal(items[0].id, "a", "never mutates");
});

test("pending reopen requests first", () => {
  const out = orderReopenRequests([
    request({ id: "x", status: "declined", created_at: "2026-11-11T00:00:00Z" }),
    request({ id: "y", status: "pending", created_at: "2026-11-01T00:00:00Z" }),
  ]);
  assert.deepEqual(out.map((r) => r.id), ["y", "x"]);
});

test("who may dismiss: the owner, the writer, or the server's word", () => {
  assert.equal(canDismiss(challenge({}), null, true), true);
  assert.equal(canDismiss(challenge({}), "u-raj", false), true);
  assert.equal(canDismiss(challenge({}), "u-priya", false), false);
  assert.equal(canDismiss(challenge({ status: "dismissed" }), null, true), false);
  assert.equal(canDismiss(challenge({ viewer_can_dismiss: false }), null, true), false);
  assert.equal(canDismiss(challenge({ viewer_can_dismiss: true }), null, false), true);
});

test("default dates: the next weekday at 10:00, a follow-up a week out", () => {
  const friday = new Date(2026, 10, 13, 15, 30);
  const start = defaultRevisitStart(friday);
  assert.equal(start.getDay(), 1);
  assert.equal(start.getHours(), 10);
  assert.equal(localDateTime(start), "2026-11-16T10:00");
  assert.equal(defaultFollowUpDue(friday), "2026-11-20");
  assert.equal(localDate(friday), "2026-11-13");
});

test("accepting: a revisit needs a future start, a follow-up a date from today", () => {
  const now = new Date(2026, 10, 11, 12, 0);
  const revisit = checkAccept({ outcome: "revisit", when: "2026-11-12T10:00", due: "", note: "  Let's talk  " }, now);
  assert.ok(revisit.ok);
  if (revisit.ok) {
    assert.equal(revisit.body.outcome, "revisit");
    assert.equal(revisit.body.scheduled_start, new Date(2026, 10, 12, 10, 0).toISOString());
    assert.equal(revisit.body.note, "Let's talk");
    assert.equal(revisit.body.due_date, undefined);
  }
  assert.deepEqual(checkAccept({ outcome: "revisit", when: "2026-11-10T10:00", due: "", note: "" }, now), {
    ok: false,
    field: "when",
    message: "Pick a time in the future.",
  });
  assert.equal(checkAccept({ outcome: "revisit", when: "", due: "", note: "" }, now).ok, false);
  const follow = checkAccept({ outcome: "follow_up", when: "", due: "2026-11-18", note: "" }, now);
  assert.deepEqual(follow, { ok: true, body: { outcome: "follow_up", due_date: "2026-11-18" } });
  assert.equal(checkAccept({ outcome: "follow_up", when: "", due: "2026-11-01", note: "" }, now).ok, false);
  assert.equal(checkAccept({ outcome: "follow_up", when: "", due: "", note: "x".repeat(1001) }, now).ok, false);
});

test("a reason is optional and kept to one tidy line", () => {
  assert.deepEqual(checkReason("  "), { ok: true, reason: undefined });
  assert.deepEqual(checkReason(" The  market moved\n"), { ok: true, reason: "The market moved" });
  assert.equal(checkReason("x".repeat(1001)).ok, false);
});

test("a settled request says what happened", () => {
  assert.equal(reopenOutcomeLine({ status: "accepted", outcome: "revisit" }), "A revisit meeting is scheduled.");
  assert.equal(reopenOutcomeLine({ status: "accepted", outcome: "follow_up" }), "A follow-up task was created for the owner.");
  assert.equal(reopenOutcomeLine({ status: "declined", outcome: null }), "The owner kept the decision as it is.");
  assert.equal(reopenOutcomeLine({ status: "withdrawn", outcome: null }), "The request was withdrawn.");
});

/* ---------------- Inbox copy ---------------- */

const row = (over: Partial<FeedRowInput>): FeedRowInput => ({
  id: "n1",
  meeting_id: null,
  source: "notification",
  alert_type: null,
  priority: 3,
  title: "",
  body: "",
  link: null,
  payload: null,
  status: "unread",
  created_at: "2026-11-11T09:00:00Z",
  ...over,
});

test("a challenge to your decision needs attention and quotes what was written", () => {
  const n = describeNotification(
    row({
      title: "Your decision was challenged",
      body: "In #pricing: the pricing review set the team plan at $18 a seat.",
      link: "/meetings/m1/decisions/d1#challenges",
      payload: { source_event_id: `decision-challenge:${C}`, quote: "Give the team plan away free", place_label: "#pricing" },
    }),
  );
  assert.equal(n.kind, "decision_challenged");
  assert.equal(n.priority, 2);
  assert.equal(n.quote, "Give the team plan away free");
  assert.equal(n.href, "/meetings/m1/decisions/d1#challenges");
  assert.equal(n.linkLabel, "Open the decision");
  const bare = describeNotification(row({ payload: { source_event_id: `decision-challenge:${C}`, place_label: "Gmail" } }));
  assert.equal(bare.title, "Your decision was challenged in Gmail");
  assert.equal(bare.href, "/decisions");
});

test("a reopen request waits on the owner; its answer only informs", () => {
  const asked = describeNotification(
    row({ title: "Raj Patel asked to reopen your decision", link: `/meetings/m1/decisions/d1?reopen=${R}#challenges`, payload: { source_event_id: `decision-reopen:${R}` } }),
  );
  assert.equal(asked.kind, "reopen_requested");
  assert.equal(asked.priority, 2);
  assert.equal(asked.sourceEventId, `decision-reopen:${R}`);
  assert.equal(asked.href, `/meetings/m1/decisions/d1?reopen=${R}#challenges`);
  const answered = describeNotification(row({ priority: 1, payload: { source_event_id: `decision-reopen-resolved:${R}` }, link: "https://evil.example" }));
  assert.equal(answered.kind, "reopen_resolved");
  assert.equal(answered.priority, 3);
  assert.equal(answered.href, "/decisions", "an off-site link is never followed");
});

/* ---------------- Slack card ---------------- */

test("the Slack card's decision checks line follows the server", () => {
  const items = normalizeIntegrations({
    items: [
      { provider: "slack", configured: true, status: "active", scopes: ["channels:history"], decision_checks: "needs_reconnect" },
      { provider: "jira", configured: true, status: "active", scopes: [], decision_checks: "on" },
      { provider: "google_calendar", configured: true, status: "active", scopes: [], decision_checks: "bogus" },
    ],
  });
  assert.equal(items.get("slack")?.decision_checks, "needs_reconnect");
  assert.equal(items.get("google_calendar")?.decision_checks, null);
  assert.equal(decisionChecksCopy("on")?.tone, "ok");
  assert.match(decisionChecksCopy("needs_reconnect")?.text ?? "", /^Reconnect Slack to let Mytheus check messages against decisions/);
  assert.equal(decisionChecksCopy(null), null);
  assert.equal(scopeLabel("channels:history"), "Read messages in public channels it is in");
});
