// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cardState,
  isConnectable,
  normalizeIntegrations,
  parseReturnState,
  safeHttpsUrl,
  trackerOptions,
} from "../src/lib/integrations.ts";

const row = (provider: string, over: Record<string, unknown> = {}) => ({
  provider,
  configured: true,
  status: null,
  scopes: [],
  external_account_id: null,
  installed_by: null,
  installed_at: null,
  last_synced_at: null,
  ...over,
});

test("PM radio: Jira selected, Linear shown but never selectable or connectable", () => {
  const opts = trackerOptions(normalizeIntegrations({ items: [row("jira")] }));
  const jira = opts.find((o) => o.key === "jira")!;
  const linear = opts.find((o) => o.key === "linear")!;
  assert.equal(opts.length, 2);
  assert.equal(jira.selected, true);
  assert.equal(jira.canConnect, true);
  assert.equal(linear.selected, false);
  assert.equal(linear.selectable, false);
  assert.equal(linear.canConnect, false);
  assert.equal(linear.reason, "not_available");
});

test("PM radio: Linear stays disabled even if the server lists it as configured", () => {
  const opts = trackerOptions(normalizeIntegrations([row("jira"), row("linear")]));
  assert.equal(opts.find((o) => o.key === "linear")!.canConnect, false);
});

test("PM radio: unconfigured Jira cannot be connected", () => {
  const jira = trackerOptions(normalizeIntegrations([row("jira", { configured: false })]))[0];
  assert.equal(jira.canConnect, false);
  assert.equal(jira.reason, "not_configured");
  // Missing from the list entirely reads the same way.
  assert.equal(trackerOptions(new Map())[0].reason, "not_configured");
});

test("PM radio: a connected Jira has no Connect; another tracker connected blocks Jira", () => {
  const connected = trackerOptions(normalizeIntegrations([row("jira", { status: "active" })]))[0];
  assert.equal(connected.canConnect, false);
  assert.equal(connected.reason, "connected");
  const blocked = trackerOptions(normalizeIntegrations([row("jira"), row("linear", { status: "active" })]))[0];
  assert.equal(blocked.canConnect, false);
  assert.equal(blocked.reason, "other_tracker_connected");
});

test("card state follows configured and status", () => {
  assert.deepEqual(cardState(undefined), { kind: "not_configured" });
  assert.deepEqual(cardState(row("slack", { configured: false }) as never), { kind: "not_configured" });
  assert.deepEqual(cardState(row("slack") as never), { kind: "available" });
  assert.deepEqual(cardState(row("slack", { status: "disconnected" }) as never), { kind: "available" });
  assert.deepEqual(cardState(row("slack", { status: "degraded" }) as never), { kind: "connected", status: "degraded" });
});

test("normalize drops unknown providers and any field that is not rendered", () => {
  const m = normalizeIntegrations({
    items: [row("slack", { access_token: "xoxb-secret", status: "active", scopes: ["chat:write", 4] }), row("dropbox")],
  });
  assert.deepEqual([...m.keys()], ["slack"]);
  const slack = m.get("slack")!;
  assert.equal("access_token" in slack, false);
  assert.deepEqual(slack.scopes, ["chat:write"]);
  assert.equal(JSON.stringify(slack).includes("secret"), false);
  assert.equal(normalizeIntegrations(null).size, 0);
});

test("return state: connected, disconnected, errors, and nothing", () => {
  assert.deepEqual(parseReturnState({ connected: "slack" }), { tone: "success", provider: "slack", message: "Slack is connected." });
  assert.equal(parseReturnState({ connected: ["jira", "slack"] })!.tone, "success");
  assert.equal(parseReturnState({ disconnected: "google_calendar" })!.tone, "info");
  assert.equal(parseReturnState({ connected: "linear" }), null);
  assert.equal(parseReturnState({ connected: "<script>" }), null);
  assert.equal(parseReturnState({}), null);
  const denied = parseReturnState({ error: "access_denied" })!;
  assert.equal(denied.tone, "error");
  assert.match(denied.message, /cancelled/);
  assert.match(parseReturnState({ error: "PM_ALREADY_CONNECTED" })!.message, /already connected/);
});

test("return state: an unknown error code is never echoed back", () => {
  const b = parseReturnState({ error: "Your account is hacked, call 555" })!;
  assert.equal(b.tone, "error");
  assert.equal(b.message.includes("555"), false);
  // An error wins over a success param in the same URL.
  assert.equal(parseReturnState({ error: "exchange_failed", connected: "slack" })!.tone, "error");
});

test("only https redirect targets and only the three built providers are accepted", () => {
  assert.equal(safeHttpsUrl("https://slack.com/oauth/v2/authorize?x=1"), "https://slack.com/oauth/v2/authorize?x=1");
  assert.equal(safeHttpsUrl("http://slack.com/"), null);
  assert.equal(safeHttpsUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpsUrl("/relative"), null);
  assert.equal(safeHttpsUrl(undefined), null);
  assert.equal(isConnectable("jira"), true);
  assert.equal(isConnectable("linear"), false);
});
