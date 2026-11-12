// Run: npm test
// Phase 4 reach in the app: API access, decision sharing, tasks from /actions/mine, the email
// channel state, the new integration providers, and admin data erasure.
import assert from "node:assert/strict";
import { test } from "node:test";

import { activeCount, apiOrigin, connectionSnippets, sortTokens, tokenStatus, validateTokenInput, type ApiTokenRow } from "../src/lib/api-access.ts";
import { exportAvailability, exportErrorMessage, reusableLink, shareErrorMessage, slackChannel, type ShareLinkView } from "../src/lib/decision-reach.ts";
import { confirmMatches, confirmPhrase, erasureErrorMessage, erasureSummary } from "../src/lib/erasure.ts";
import { cardState, isConnectable, normalizeIntegrations, parseReturnState, readCallback } from "../src/lib/integrations.ts";
import { emailDelivery } from "../src/lib/notification-preferences.ts";
import { taskFromMine } from "../src/lib/tasks.ts";

const token = (over: Partial<ApiTokenRow> = {}): ApiTokenRow => ({
  id: "t1",
  name: "Claude Desktop",
  scope: "read",
  state: "active",
  token_preview: "mytheus_pat_...abcd",
  created_at: "2026-11-01T00:00:00Z",
  expires_at: "2027-02-01T00:00:00Z",
  ...over,
});

test("token input follows the server's rules", () => {
  assert.equal(validateTokenInput({ name: "  ", scope: "read", expiresInDays: 90 })?.field, "name");
  assert.equal(validateTokenInput({ name: "x".repeat(81), scope: "read", expiresInDays: 90 })?.field, "name");
  assert.equal(validateTokenInput({ name: "CLI", scope: "admin", expiresInDays: 90 })?.field, "scope");
  assert.equal(validateTokenInput({ name: "CLI", scope: "read", expiresInDays: 366 })?.field, "expiry");
  assert.equal(validateTokenInput({ name: "CLI", scope: "read_write", expiresInDays: 365 }), null);
});

test("active tokens list first and near expiry is called out", () => {
  const rows = sortTokens([
    token({ id: "old", state: "revoked", created_at: "2026-11-05T00:00:00Z" }),
    token({ id: "a", created_at: "2026-10-01T00:00:00Z" }),
    token({ id: "b", created_at: "2026-11-02T00:00:00Z" }),
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["b", "a", "old"]);
  assert.equal(activeCount(rows), 2);
  const now = new Date("2026-11-11T00:00:00Z");
  assert.deepEqual(tokenStatus(token({ expires_at: "2026-11-14T00:00:00Z" }), now), { tone: "medium", label: "Expires in 3 days" });
  assert.equal(tokenStatus(token(), now).label, "Active");
  assert.equal(tokenStatus(token({ state: "expired" }), now).label, "Expired");
});

test("snippets point at the gateway and never hold a token", () => {
  assert.equal(apiOrigin(undefined), "https://api.mytheus.cloud");
  assert.equal(apiOrigin("http://localhost:8000"), "https://api.mytheus.cloud");
  assert.equal(apiOrigin("https://api.example.com/x"), "https://api.example.com");
  const snippets = connectionSnippets("https://api.mytheus.cloud");
  assert.deepEqual(snippets.map((s) => s.id), ["claude-code", "claude-desktop", "curl-search", "curl-ask"]);
  for (const s of snippets) {
    assert.match(s.code, /MYTHEUS_TOKEN/);
    assert.doesNotMatch(s.code, /mytheus_pat_/);
  }
  assert.match(snippets[0].code, /https:\/\/api\.mytheus\.cloud\/mcp/);
  assert.doesNotThrow(() => JSON.parse(snippets[1].code));
});

test("an export is off, with the reason, until its tool is configured, connected and has somewhere to go", () => {
  assert.equal(exportAvailability("notion", { kind: "unavailable" }, false).enabled, false);
  const notConfigured = exportAvailability("notion", { kind: "live", configured: false, connected: false, destinations: [], note: null }, true);
  assert.equal(notConfigured.enabled ? null : notConfigured.reason, "not_configured");
  const notConnected = exportAvailability("confluence", { kind: "live", configured: true, connected: false, destinations: [], note: null }, false);
  assert.ok(!notConnected.enabled && /workspace admin/.test(notConnected.message));
  const empty = exportAvailability("notion", { kind: "live", configured: true, connected: true, destinations: [], note: null }, false);
  assert.equal(empty.enabled ? null : empty.reason, "no_destinations");
  // Slack always has the direct message.
  assert.equal(exportAvailability("slack", { kind: "live", configured: true, connected: true, destinations: [], note: null }, false).enabled, true);
});

test("slack channel ids and refusal copy", () => {
  assert.deepEqual(slackChannel(""), { ok: true, channel: null });
  assert.deepEqual(slackChannel(" c0123abc "), { ok: true, channel: "C0123ABC" });
  assert.equal(slackChannel("#general").ok, false);
  assert.match(exportErrorMessage("slack", 409, "slack_user_not_found"), /email/);
  assert.match(exportErrorMessage("notion", 409, "not_connected"), /not connected/);
  assert.match(shareErrorMessage(403, "confidential_host_only"), /confidential/);
});

test("Copy share link reuses your newest active link", () => {
  const link = (over: Partial<ShareLinkView>): ShareLinkView => ({
    id: "l",
    url: "https://app/s/x",
    state: "active",
    created_at: "2026-11-01T00:00:00Z",
    expires_at: "2026-12-01T00:00:00Z",
    view_count: 0,
    can_revoke: true,
    ...over,
  });
  assert.equal(reusableLink([]), null);
  assert.equal(
    reusableLink([
      link({ id: "old", created_at: "2026-10-01T00:00:00Z" }),
      link({ id: "new", created_at: "2026-11-05T00:00:00Z" }),
      link({ id: "theirs", created_at: "2026-11-09T00:00:00Z", can_revoke: false }),
      link({ id: "dead", created_at: "2026-11-10T00:00:00Z", state: "revoked" }),
    ])?.id,
    "new",
  );
});

test("tasks from /actions/mine keep tasks with no meeting", () => {
  const byHand = taskFromMine({ id: "1", content: "Send the deck", status: "confirmed", meeting_id: null, due_date: "2026-11-20" }, "Maya");
  assert.equal(byHand.meetingId, null);
  assert.equal(byHand.meetingTitle, null);
  assert.equal(byHand.status, "open");
  const fromMeeting = taskFromMine({ id: "2", content: "x", status: "done", meeting_id: "m", meeting_title: " " }, "Maya");
  assert.equal(fromMeeting.meetingTitle, "Untitled meeting");
  assert.equal(fromMeeting.status, "done");
});

test("the email channel says when the server cannot send email", () => {
  assert.equal(emailDelivery({ items: [], email_configured: false }), "not_connected");
  assert.equal(emailDelivery({ items: [], email_configured: true }), "connected");
  assert.equal(emailDelivery({ items: [] }), "unknown");
  assert.equal(emailDelivery(null), "unknown");
});

test("HubSpot, Notion and Confluence connect like the R8 providers, with Not available yet when unconfigured", () => {
  for (const p of ["hubspot", "notion", "confluence"]) assert.equal(isConnectable(p), true);
  assert.equal(isConnectable("github"), false); // Linear is connectable since ADR-0044
  const items = normalizeIntegrations([{ provider: "notion", configured: false, status: null }]);
  assert.deepEqual(cardState(items.get("notion")), { kind: "not_configured" });
  assert.deepEqual(parseReturnState({ connected: "hubspot" }), { tone: "success", provider: "hubspot", message: "HubSpot is connected." });
  assert.equal(readCallback("confluence", { code: "c", state: "s" }).kind, "exchange");
});

test("erasure confirmation and summary", () => {
  assert.equal(confirmPhrase("person", { email: " priya@example.com " }), "priya@example.com");
  assert.equal(confirmPhrase("meeting", { title: "   " }), "Untitled meeting");
  assert.equal(confirmMatches("PRIYA@example.com ", "priya@example.com"), true);
  assert.equal(confirmMatches("priya@example", "priya@example.com"), false);
  assert.equal(confirmMatches("", ""), false);
  assert.equal(
    erasureSummary({ erased: { notes: 12, promises: 1, chat_messages: 0 }, revoked_tokens: 2 }),
    "12 notes, 1 promise and 2 access tokens removed",
  );
  assert.equal(erasureSummary({ erased: { notes: 0 } }), "Nothing was left to erase");
  assert.match(erasureErrorMessage("meeting", 409, "meeting_live"), /live/);
  assert.match(erasureErrorMessage("person", 422, "self"), /own data/);
});
