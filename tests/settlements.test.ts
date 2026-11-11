// Run: npm test
// Settle threads (a4 contract 3d), the reopened reversal (3c) and the two new notifications, in
// src/lib/settlements.ts and the notification copy.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkKeepNote,
  checkMessage,
  hiddenLine,
  newNotificationLabel,
  normalizeSettlement,
  normalizeSettlements,
  outcomeLine,
  proposalLine,
  reopenedLine,
  reversalKind,
  settleRoutes,
  sideHref,
} from "../src/lib/settlements.ts";
import { describeNotification } from "../src/components/notifications/alert-copy.ts";

const S = "7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const side = (over: Record<string, unknown>) => ({
  decision_id: "d-mine",
  meeting_id: "m-1",
  meeting_title: "Pricing review",
  decided_at: "2026-11-03T10:00:00Z",
  owner: { user_id: "u-sarah", name: "Sarah Okafor" },
  team: "Product",
  content: "Raise the team plan to $18 a seat",
  quote: "We move to eighteen in January.",
  quote_speaker: { user_id: "u-sarah", name: "Sarah Okafor" },
  visible: true,
  shared: false,
  mine: true,
  ...over,
});
const WIRE = {
  id: S,
  status: "open",
  created_at: "2026-11-10T09:00:00Z",
  confidence: 0.82,
  rationale: "One raises the price for everyone; the other promises renewals keep their price.",
  mine: side({}),
  theirs: side({ decision_id: "d-theirs", owner: { user_id: "u-priya", name: "Priya Nair" }, team: "Sales", mine: false, visible: false, content: "leak", quote: "leak", meeting_title: "Secret" }),
  proposal: null,
  resolution: null,
  messages: [
    { id: "2", author: { user_id: "u-priya", name: "Priya Nair" }, mine: false, body: "Later", created_at: "2026-11-10T10:00:00Z" },
    { id: "1", author: { user_id: "u-sarah", name: "Sarah Okafor" }, mine: true, body: "Earlier", created_at: "2026-11-10T09:30:00Z" },
  ],
};

test("normalizes a thread; hidden wording never travels", () => {
  const s = normalizeSettlement(WIRE);
  assert.ok(s);
  assert.equal(s.theirs.content, null);
  assert.equal(s.theirs.quote, null);
  assert.equal(s.theirs.meeting_title, null);
  assert.equal(hiddenLine(s.theirs), "Only Priya Nair can share the wording of their decision.");
  assert.equal(sideHref(s.theirs), null);
  assert.equal(sideHref(s.mine), "/meetings/m-1/decisions/d-mine");
  assert.deepEqual(s.messages.map((m) => m.body), ["Earlier", "Later"], "newest last");
  assert.equal(normalizeSettlement({ id: S }), null);
  assert.equal(normalizeSettlements({ items: [WIRE, { nope: 1 }] })?.length, 1);
});

test("proposals read from the viewer's side", () => {
  const s = normalizeSettlement(WIRE)!;
  assert.equal(proposalLine(s), null);
  assert.match(proposalLine({ ...s, proposal: { winner_decision_id: "d-mine", by_me: true, at: "" } })!, /Priya Nair has to accept/);
  assert.match(proposalLine({ ...s, proposal: { winner_decision_id: "d-theirs", by_me: false, at: "" } })!, /If you accept, yours is superseded/);
});

test("resolved threads say what happened", () => {
  const s = normalizeSettlement(WIRE)!;
  const r = { by: { user_id: "u-priya", name: "Priya Nair" }, at: "2026-11-11T10:00:00Z", note: "Renewals only", winner_decision_id: null, meeting_id: null };
  assert.equal(outcomeLine({ ...s, status: "kept_both", resolution: r }), "Priya Nair kept both decisions: they can stand together.");
  assert.match(outcomeLine({ ...s, status: "superseded", resolution: { ...r, winner_decision_id: "d-mine" } }), /^Your decision stands/);
  assert.match(outcomeLine({ ...s, status: "superseded", resolution: { ...r, winner_decision_id: "d-theirs" } }), /^Priya Nair's decision stands/);
  assert.equal(outcomeLine({ ...s, status: "meeting_booked", resolution: r }), "Priya Nair booked a meeting to settle it together.");
});

test("requests match the contract", () => {
  assert.deepEqual(settleRoutes.list("open"), { method: "GET", path: "/api/v1/settlements", query: { status: "open" } });
  assert.deepEqual(settleRoutes.message(S, "hi").body, { body: "hi" });
  assert.deepEqual(settleRoutes.keepBoth(S, "n").body, { note: "n" });
  assert.deepEqual(settleRoutes.supersede(S, "d").body, { winner_decision_id: "d" });
  assert.equal(settleRoutes.slot(S).path, `/api/v1/settlements/${S}/meeting-slot`);
  assert.deepEqual(settleRoutes.book(S, null).body, {});
  for (const k of ["share", "accept", "decline"] as const) assert.equal(settleRoutes[k](S).path, `/api/v1/settlements/${S}/${k}`);
});

test("message and note limits", () => {
  assert.equal(checkMessage("  ").ok, false);
  assert.equal(checkMessage("x".repeat(1001)).ok, false);
  assert.deepEqual(checkMessage(" hi\nthere "), { ok: true, body: "hi\nthere" });
  assert.equal(checkKeepNote("").ok, false);
  assert.deepEqual(checkKeepNote(" renewals  only "), { ok: true, note: "renewals only" });
});

test("reopened reversals", () => {
  assert.equal(reversalKind({ id: "r" }), "superseded");
  assert.equal(reversalKind({ id: "r", kind: "reopened" }), "reopened");
  assert.equal(reopenedLine("Go with Acme."), "Go with Acme was reopened because a reason for it no longer holds.");
});

test("the two new notifications link to their screens with a plain label", () => {
  assert.equal(newNotificationLabel(`settle:${S}:opened`, null), "Settle it together");
  assert.equal(newNotificationLabel(null, "/meetings/m/decisions/d?assumption=a#why"), "See what changed");
  assert.equal(newNotificationLabel(null, "/work/tasks"), null);
  const row = {
    id: "n1",
    meeting_id: null,
    source: "notification",
    alert_type: null,
    priority: 2,
    title: "Two decisions may clash: settle it together",
    body: "",
    link: `/work/settle/${S}`,
    payload: { source_event_id: `settle:${S}:opened` },
    status: "unread",
    created_at: "2026-11-10T09:00:00Z",
  };
  const item = describeNotification(row);
  assert.equal(item.href, `/work/settle/${S}`);
  assert.equal(item.linkLabel, "Settle it together");
  const broke = describeNotification({
    ...row,
    title: "A reason for your decision is no longer true",
    link: `/meetings/m/decisions/d?assumption=${S}#why`,
    payload: { source_event_id: "assumption-break:e1" },
  });
  assert.equal(broke.href, `/meetings/m/decisions/d?assumption=${S}#why`);
  assert.equal(broke.linkLabel, "See what changed");
});
