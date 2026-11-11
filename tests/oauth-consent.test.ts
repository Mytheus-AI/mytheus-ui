// Run: npm test
// Connecting an app (a Claude custom connector) over OAuth: the consent page's states, the safe
// return check, the access a person may choose, and the Connected apps view model.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CONSENT_PROBLEM,
  claudeConnectorSteps,
  consentPath,
  lastActivity,
  problemFromApi,
  problemFromAuthorizeError,
  safeReturnUrl,
  scopeChoices,
  sortConnectedApps,
  type ConnectedAppRow,
} from "../src/lib/oauth-consent.ts";

test("authorize errors become the matching explanation, never a redirect", () => {
  assert.equal(problemFromAuthorizeError(undefined), null);
  assert.equal(problemFromAuthorizeError("invalid_client"), "unknown_client");
  assert.equal(problemFromAuthorizeError("invalid_redirect_uri"), "invalid_redirect");
  assert.equal(problemFromAuthorizeError("something_else"), "invalid_request");
});

test("consent read failures map from status and reason", () => {
  assert.equal(problemFromApi(400, "expired_request"), "expired_request");
  assert.equal(problemFromApi(400, "invalid_request"), "invalid_request");
  assert.equal(problemFromApi(404, "unknown_client"), "unknown_client");
  assert.equal(problemFromApi(404, null), "unknown_client");
  assert.equal(problemFromApi(403, null), "no_account");
  assert.equal(problemFromApi(422, null), "invalid_request");
  assert.equal(problemFromApi(503, null), "unavailable");
  assert.equal(problemFromApi(0, null), "unavailable");
  // Only a passing failure offers Retry; the rest say what to do in the app.
  assert.deepEqual(
    Object.entries(CONSENT_PROBLEM).filter(([, v]) => v.retry).map(([k]) => k),
    ["unavailable"],
  );
});

test("a person can narrow read and act to read only, never widen", () => {
  assert.deepEqual(scopeChoices("read_write"), ["read_write", "read"]);
  assert.deepEqual(scopeChoices("read"), ["read"]);
});

test("the browser is sent back only to https or a loopback address", () => {
  assert.equal(safeReturnUrl("https://claude.ai/api/mcp/auth_callback?code=c&state=s"), "https://claude.ai/api/mcp/auth_callback?code=c&state=s");
  assert.equal(safeReturnUrl("http://localhost:3118/callback?code=c"), "http://localhost:3118/callback?code=c");
  assert.equal(safeReturnUrl("http://127.0.0.1:9/cb"), "http://127.0.0.1:9/cb");
  assert.equal(safeReturnUrl("http://evil.example/cb"), null);
  assert.equal(safeReturnUrl("javascript:alert(1)"), null);
  assert.equal(safeReturnUrl("/relative"), null);
  assert.equal(safeReturnUrl(null), null);
});

test("the sign-in round trip keeps the request", () => {
  assert.equal(consentPath("a.b+c/="), "/oauth/consent?request=a.b%2Bc%2F%3D");
});

const app = (over: Partial<ConnectedAppRow> = {}): ConnectedAppRow => ({
  id: "g1",
  client_id: "mcp_x",
  client_name: "Claude",
  redirect_host: "claude.ai",
  verified_redirect: true,
  scope: "read_write",
  connected_at: "2026-11-01T00:00:00Z",
  ...over,
});

test("connected apps list newest first with their latest activity", () => {
  const rows = sortConnectedApps([app({ id: "old" }), app({ id: "new", connected_at: "2026-11-09T00:00:00Z" })]);
  assert.deepEqual(rows.map((r) => r.id), ["new", "old"]);
  assert.equal(lastActivity(app()), null);
  assert.equal(lastActivity(app({ last_used_at: "2026-11-10T00:00:00Z", last_refreshed_at: "2026-11-09T00:00:00Z" })), "2026-11-10T00:00:00Z");
  assert.equal(lastActivity(app({ last_refreshed_at: "2026-11-09T00:00:00Z" })), "2026-11-09T00:00:00Z");
});

test("the Claude connector steps name the MCP URL and need no client ID", () => {
  const steps = claudeConnectorSteps("https://api.mytheus.cloud/mcp");
  assert.equal(steps.length, 3);
  assert.match(steps[1], /https:\/\/api\.mytheus\.cloud\/mcp/);
  assert.match(steps[1], /Leave the OAuth client ID and secret empty/);
  for (const s of steps) assert.doesNotMatch(s, /[–—]/);
});
