// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  callbackOutcome,
  readCallback,
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

test("callback: provider validated before any call; code and state required", () => {
  assert.deepEqual(readCallback("linear", { code: "c", state: "s" }), { kind: "done", location: "/settings/integrations?error=invalid_provider" });
  assert.deepEqual(readCallback("../oauth", { code: "c", state: "s" }), { kind: "done", location: "/settings/integrations?error=invalid_provider" });
  assert.deepEqual(readCallback("slack", { code: "c" }), { kind: "done", location: "/settings/integrations?error=invalid_state" });
  assert.deepEqual(readCallback("slack", { code: "c", state: "x".repeat(5000) }), { kind: "done", location: "/settings/integrations?error=invalid_state" });
  assert.deepEqual(readCallback("jira", { code: ["c1", "c2"], state: "s" }), { kind: "exchange", provider: "jira", code: "c1", state: "s" });
});

test("callback: provider error wins and is never echoed", () => {
  assert.deepEqual(readCallback("google_calendar", { error: "access_denied", code: "c", state: "s" }), {
    kind: "done",
    location: "/settings/integrations?error=access_denied",
  });
  const odd = readCallback("slack", { error: "<b>pwned</b>" });
  assert.equal(odd.kind === "done" && odd.location, "/settings/integrations?error=access_denied");
});

test("callback outcome mapping", () => {
  const go = (status: number, code: string) => callbackOutcome("jira", { ok: false, status, code });
  assert.equal(callbackOutcome("slack", { ok: true }), "/settings/integrations?connected=slack");
  assert.equal(go(409, "ACCOUNT_CONNECTED_ELSEWHERE"), "/settings/integrations?error=account_connected_elsewhere");
  assert.equal(go(409, "PM_ALREADY_CONNECTED"), "/settings/integrations?error=pm_already_connected");
  assert.equal(go(409, "PROVIDER_NOT_CONFIGURED"), "/settings/integrations?error=not_configured");
  assert.equal(go(403, "FORBIDDEN_ROLE"), "/settings/integrations?error=forbidden");
  assert.equal(go(401, "AUTH_REQUIRED"), "/settings/integrations?error=session_expired");
  assert.equal(go(400, "STATE_EXPIRED"), "/settings/integrations?error=state_expired");
  assert.equal(go(400, "INVALID_STATE"), "/settings/integrations?error=invalid_state");
  assert.equal(go(422, "VALIDATION_FAILED"), "/settings/integrations?error=invalid_state");
  assert.equal(go(502, "DEPENDENCY_UNAVAILABLE"), "/settings/integrations?error=exchange_failed");
  assert.equal(go(0, ""), "/settings/integrations?error=exchange_failed");
  // the server's `reason` wins when it is a known key, and is ignored otherwise
  const why = (status: number, code: string, reason: string) => callbackOutcome("slack", { ok: false, status, code, reason });
  assert.equal(why(400, "VALIDATION_FAILED", "state_expired"), "/settings/integrations?error=state_expired");
  assert.equal(why(400, "VALIDATION_FAILED", "exchange_failed"), "/settings/integrations?error=exchange_failed");
  assert.equal(why(502, "DEPENDENCY_UNAVAILABLE", "post_install_failed"), "/settings/integrations?error=post_install_failed");
  assert.equal(why(409, "ACCOUNT_CONNECTED_ELSEWHERE", "account_connected_elsewhere"), "/settings/integrations?error=account_connected_elsewhere");
  assert.equal(why(400, "VALIDATION_FAILED", "drop_tables"), "/settings/integrations?error=invalid_state");
  // every mapped key has its own plain message on the integrations page
  for (const url of [go(409, "ACCOUNT_CONNECTED_ELSEWHERE"), go(403, "X"), go(400, "STATE_EXPIRED"), go(400, "INVALID_STATE")]) {
    const key = new URL(url, "https://x").searchParams.get("error")!;
    assert.doesNotMatch(parseReturnState({ error: key })!.message, /did not complete/);
  }
});

test("callback outcomes never carry the code or state", () => {
  const input = readCallback("slack", { code: "SECRET_CODE", state: "SECRET_STATE" });
  assert.equal(input.kind, "exchange");
  for (const loc of [callbackOutcome("slack", { ok: true }), callbackOutcome("slack", { ok: false, status: 400, code: "INVALID_STATE" })]) {
    assert.equal(loc.includes("SECRET"), false);
  }
});

/* ---- the settings page's view (redesign of 2026-11-12) ---- */
import { CONNECTABLE, SETUP_GUIDES, VIEW_CHIP, appOriginFrom, callbackUrl, providerView } from "../src/lib/integrations.ts";

test("view: one state per card, from configured and status", () => {
  assert.equal(providerView(undefined), "needs_setup");
  assert.equal(providerView(row("slack", { configured: false }) as never), "needs_setup");
  assert.equal(providerView(row("slack") as never), "ready");
  assert.equal(providerView(row("slack", { status: "disconnected" }) as never), "ready");
  assert.equal(providerView(row("slack", { status: "active" }) as never), "connected");
  assert.equal(providerView(row("slack", { status: "degraded" }) as never), "error");
  assert.equal(providerView(row("jira") as never, { otherTrackerConnected: true }), "blocked");
  assert.equal(providerView(row("jira", { status: "active" }) as never), "connected");
  assert.equal(VIEW_CHIP.needs_setup.label, "Needs setup");
  assert.equal(VIEW_CHIP.ready.label, "Ready to connect");
});

test("redirect URL is the app's own callback page, per provider", () => {
  assert.equal(callbackUrl("https://dashboard.mytheus.cloud", "slack"), "https://dashboard.mytheus.cloud/settings/integrations/callback/slack");
  assert.equal(callbackUrl("http://localhost:3000/", "google_calendar"), "http://localhost:3000/settings/integrations/callback/google_calendar");
});

test("app origin from the request host, never a crafted one", () => {
  assert.equal(appOriginFrom("dashboard.mytheus.cloud", "https"), "https://dashboard.mytheus.cloud");
  assert.equal(appOriginFrom("dashboard.mytheus.cloud, proxy.internal", "https, http"), "https://dashboard.mytheus.cloud");
  assert.equal(appOriginFrom("localhost:3000", null), "http://localhost:3000");
  assert.equal(appOriginFrom(null, null), "https://dashboard.mytheus.cloud");
  assert.equal(appOriginFrom("evil.com/path?x", "https"), "https://dashboard.mytheus.cloud");
  assert.equal(appOriginFrom("ex ample.com", "https"), "https://dashboard.mytheus.cloud");
  assert.equal(appOriginFrom("dashboard.mytheus.cloud", "javascript"), "https://dashboard.mytheus.cloud");
});

test("every connectable provider has a setup guide with an https console link, env names and scopes", () => {
  const env: Record<string, string[]> = {
    google_calendar: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", "SLACK_SIGNING_SECRET"],
    jira: ["JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET"],
    hubspot: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
    notion: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
    confluence: ["CONFLUENCE_CLIENT_ID", "CONFLUENCE_CLIENT_SECRET"],
  };
  for (const p of CONNECTABLE) {
    const g = SETUP_GUIDES[p as keyof typeof SETUP_GUIDES];
    assert.ok(g, p);
    assert.match(g.console.href, /^https:\/\//);
    assert.deepEqual(g.env, env[p]);
    assert.ok(g.scopes.length > 0 || g.scopesNote, p);
    assert.ok(g.steps.length > 0, p);
  }
  assert.ok(SETUP_GUIDES.slack.scopes.includes("channels:history"));
  assert.ok(SETUP_GUIDES.jira.scopes.includes("offline_access"));
});
