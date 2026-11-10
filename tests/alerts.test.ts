// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  alertHref,
  alertsNeedingAttention,
  applyLiveAlert,
  bannerAlerts,
  cardAlerts,
  dismissAlert,
  emptyAlertsState,
  hydrateAlerts,
  markAlertRead,
  orderedAlerts,
  relatedLink,
  safeLink,
} from "../src/lib/realtime/alerts.ts";

const A1 = "11111111-1111-5111-8111-111111111111";
const A2 = "22222222-2222-5222-8222-222222222222";
const A3 = "33333333-3333-5333-8333-333333333333";
const A4 = "44444444-4444-5444-8444-444444444444";
const M1 = "55555555-5555-4555-8555-555555555555";
const M0 = "66666666-6666-4666-8666-666666666666";
const D1 = "77777777-7777-4777-8777-777777777777";
const D0 = "88888888-8888-4888-8888-888888888888";
const U1 = "99999999-9999-4999-8999-999999999999";
const T1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const TYPE: Record<number, string> = { 1: "conflict", 2: "workload", 3: "missing_stakeholder" };

const live = (id: string, priority: number, createdAt: string, over: object = {}) => ({
  id,
  meetingId: M1,
  alertType: TYPE[priority],
  priority,
  title: `alert ${id.slice(0, 2)}`,
  body: "body",
  confidence: 0.9,
  rationale: "because",
  subject: { kind: "decision", id: D1 },
  related: [{ kind: "decision", id: D0, label: "Acme chosen for Q3" }],
  link: `/decisions/${D1}`,
  createdAt,
  ...over,
});

const row = (id: string, priority: number, status: string, over: object = {}) => ({
  id,
  meeting_id: M1,
  source: "agent_alert",
  alert_type: TYPE[priority],
  priority,
  title: `row ${id.slice(0, 2)}`,
  body: "row body",
  link: null,
  payload: { id, rationale: "server rationale", confidence: 0.8, related: [{ kind: "user", id: U1, label: "Priya" }] },
  status,
  created_at: "2026-11-10T10:00:00.000Z",
  ...over,
});

test("order is priority first, then time, regardless of arrival", () => {
  let s = emptyAlertsState;
  s = applyLiveAlert(s, live(A1, 3, "2026-11-10T10:00:00Z"));
  s = applyLiveAlert(s, live(A2, 3, "2026-11-10T10:00:01Z"));
  s = applyLiveAlert(s, live(A3, 2, "2026-11-10T10:00:05Z"));
  s = applyLiveAlert(s, live(A4, 1, "2026-11-10T10:00:09Z")); // the conflict arrives last
  assert.deepEqual(
    orderedAlerts(s).map((a) => a.id),
    [A4, A3, A1, A2],
  );
});

test("a priority-1 conflict is pinned as the banner; the rest are cards in order", () => {
  let s = emptyAlertsState;
  s = applyLiveAlert(s, live(A1, 3, "2026-11-10T10:00:00Z"));
  s = applyLiveAlert(s, live(A3, 2, "2026-11-10T10:00:01Z"));
  s = applyLiveAlert(s, live(A4, 1, "2026-11-10T10:00:02Z"));
  const all = orderedAlerts(s);
  assert.deepEqual(bannerAlerts(all).map((a) => a.id), [A4]);
  assert.deepEqual(cardAlerts(all).map((a) => a.id), [A3, A1]);
  assert.equal(bannerAlerts(all)[0].alertType, "conflict");
  // the banner stays pinned when more cards stream in after it
  s = applyLiveAlert(s, live(A2, 2, "2026-11-10T10:00:00Z"));
  assert.equal(orderedAlerts(s)[0].id, A4);
});

test("live and re-hydrated copies merge by id; read only moves forward", () => {
  let s = applyLiveAlert(emptyAlertsState, live(A1, 2, "2026-11-10T10:00:00Z"));
  s = hydrateAlerts(s, { items: [row(A1, 2, "read")] });
  assert.equal(orderedAlerts(s).length, 1);
  assert.equal(orderedAlerts(s)[0].status, "read");
  // a stale live repeat never takes it back to unread
  s = applyLiveAlert(s, live(A1, 2, "2026-11-10T10:00:00Z"));
  assert.equal(orderedAlerts(s)[0].status, "read");
});

test("a re-hydrated row carries the rationale and related chips from its payload", () => {
  const s = hydrateAlerts(emptyAlertsState, { items: [row(A2, 3, "unread")] });
  const [a] = orderedAlerts(s);
  assert.equal(a.rationale, "server rationale");
  assert.equal(a.alertType, "missing_stakeholder");
  assert.deepEqual(a.related, [{ kind: "user", id: U1, label: "Priya", meetingId: null }]);
});

test("dismissed never returns: not from live, not from re-hydrate", () => {
  let s = applyLiveAlert(emptyAlertsState, live(A1, 1, "2026-11-10T10:00:00Z"));
  s = dismissAlert(s, A1);
  assert.equal(orderedAlerts(s).length, 0);
  s = applyLiveAlert(s, live(A1, 1, "2026-11-10T10:00:00Z"));
  s = hydrateAlerts(s, { items: [row(A1, 1, "unread")] });
  assert.equal(orderedAlerts(s).length, 0);
});

test("a row the server says is dismissed leaves the screen and stays gone", () => {
  let s = applyLiveAlert(emptyAlertsState, live(A2, 2, "2026-11-10T10:00:00Z"));
  s = hydrateAlerts(s, { items: [row(A2, 2, "dismissed")] });
  assert.equal(orderedAlerts(s).length, 0);
  s = applyLiveAlert(s, live(A2, 2, "2026-11-10T10:00:00Z"));
  assert.equal(orderedAlerts(s).length, 0);
});

test("mark read keeps the alert but stops it counting toward attention", () => {
  let s = emptyAlertsState;
  s = applyLiveAlert(s, live(A1, 1, "2026-11-10T10:00:00Z"));
  s = applyLiveAlert(s, live(A2, 2, "2026-11-10T10:00:01Z"));
  s = applyLiveAlert(s, live(A3, 3, "2026-11-10T10:00:02Z"));
  assert.equal(alertsNeedingAttention(orderedAlerts(s)), 2); // blue informs, it does not ask
  s = markAlertRead(s, A1);
  assert.equal(orderedAlerts(s).length, 3);
  assert.equal(alertsNeedingAttention(orderedAlerts(s)), 1);
  assert.equal(markAlertRead(s, A1), s);
});

test("malformed alerts and plain notifications are ignored", () => {
  let s = emptyAlertsState;
  s = applyLiveAlert(s, live("nope", 1, "2026-11-10T10:00:00Z"));
  s = applyLiveAlert(s, live(A1, 4, "2026-11-10T10:00:00Z"));
  s = applyLiveAlert(s, live(A2, 2, "2026-11-10T10:00:00Z", { alertType: "gossip" }));
  s = applyLiveAlert(s, live(A3, 2, "2026-11-10T10:00:00Z", { title: "  " }));
  s = hydrateAlerts(s, { items: [row(A4, 2, "unread", { source: "notification" })] });
  assert.equal(orderedAlerts(s).length, 0);
});

test("unsafe links never reach an href", () => {
  for (const link of [
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "/x\" onmouseover=\"y",
    // relative, but not on the allowlist
    "/settings/billing",
    "/admin/ops",
    `/meetings/${M1}/transcript`,
    `/meetings/not-a-uuid`,
    `/decisions/${D1}?next=//evil.example`,
    `/tasks/../admin`,
    `/meetings/${M1}/decisions/${D1}/edit`,
  ]) {
    const s = applyLiveAlert(emptyAlertsState, live(A1, 2, "2026-11-10T10:00:00Z", { link }));
    assert.equal(orderedAlerts(s)[0].link, null);
  }
});

test("related chips: decision to its lineage page, action to its meeting or My Tasks, user to their page", () => {
  const alert = { meetingId: M1, subject: { kind: "decision" as const, id: D1 } };
  // the subject decision lives in the alert's meeting
  assert.deepEqual(relatedLink({ kind: "decision", id: D1, label: "Beta chosen", meetingId: null }, alert), {
    label: "Beta chosen",
    href: `/meetings/${M1}/decisions/${D1}`,
  });
  // an earlier decision with its meeting known opens its own lineage page
  assert.equal(
    relatedLink({ kind: "decision", id: D0, label: "Acme chosen", meetingId: M0 }, alert).href,
    `/meetings/${M0}/decisions/${D0}`,
  );
  // without one, the Decisions list rather than a guessed meeting
  assert.equal(relatedLink({ kind: "decision", id: D0, label: "", meetingId: null }, alert).href, "/decisions");
  assert.equal(relatedLink({ kind: "decision", id: D0, label: "", meetingId: null }, alert).label, "Decision");
  assert.equal(relatedLink({ kind: "action", id: T1, label: "Migrate API", meetingId: M0 }, alert).href, `/meetings/${M0}`);
  assert.equal(relatedLink({ kind: "action", id: T1, label: "Migrate API", meetingId: null }, alert).href, "/tasks");
  assert.deepEqual(relatedLink({ kind: "user", id: U1, label: "Priya", meetingId: null }, alert), {
    label: "Priya",
    href: `/people/${U1}`,
  });
});

test("the alert's own link maps /decisions/{id} onto the lineage page", () => {
  const subject = { kind: "decision" as const, id: D1 };
  assert.equal(alertHref({ link: `/decisions/${D1}`, meetingId: M1, subject }), `/meetings/${M1}/decisions/${D1}`);
  assert.equal(alertHref({ link: `/decisions/${D0}`, meetingId: M1, subject }), "/decisions");
  assert.equal(alertHref({ link: `/meetings/${M0}`, meetingId: M1, subject }), `/meetings/${M0}`);
  assert.equal(alertHref({ link: null, meetingId: M1, subject }), null);
});

test("the link allowlist: a meeting, one of its decisions, a decision, or My Tasks, nothing else", () => {
  assert.equal(safeLink(`/meetings/${M1}`), `/meetings/${M1}`);
  assert.equal(safeLink(`/meetings/${M1}/decisions/${D1}`), `/meetings/${M1}/decisions/${D1}`);
  assert.equal(safeLink(`/decisions/${D1}`), `/decisions/${D1}`);
  assert.equal(safeLink("/tasks"), "/tasks");
  for (const bad of ["/", "/tasks/", "/decisions", "/people/" + U1, "/meetings", null, 7, undefined]) {
    assert.equal(safeLink(bad), null, String(bad));
  }
  const s = applyLiveAlert(emptyAlertsState, live(A1, 2, "2026-11-10T10:00:00Z", { link: "/settings/billing" }));
  assert.equal(alertHref(orderedAlerts(s)[0]), null);
  // a re-hydrated row is held to the same allowlist
  const h = hydrateAlerts(emptyAlertsState, { items: [row(A2, 2, "unread", { link: "/admin/ops" })] });
  assert.equal(orderedAlerts(h)[0].link, null);
});

test("in a room, an alert about another meeting is not shown (re-hydrate there is meeting-scoped)", () => {
  let s = applyLiveAlert(emptyAlertsState, live(A1, 1, "2026-11-10T10:00:00Z", { meetingId: M0 }), M1);
  s = applyLiveAlert(s, live(A2, 2, "2026-11-10T10:00:01Z", { meetingId: null }), M1);
  assert.equal(orderedAlerts(s).length, 0);
  s = applyLiveAlert(s, live(A3, 2, "2026-11-10T10:00:02Z"), M1);
  assert.deepEqual(orderedAlerts(s).map((a) => a.id), [A3]);
});
