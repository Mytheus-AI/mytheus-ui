// Run: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  decisionsProblem,
  parseCheckBody,
  parseDismissBody,
  parseReopenBody,
  safePlaceLink,
} from "../src/app/api/capture/_lib/decisions.ts";

const D = "11111111-1111-4111-8111-111111111111";

test("a check carries the paragraph, source extension and where it was written", () => {
  const ok = parseCheckBody({ text: "  We keep the free tier\nfor twenty seats.  ", site: "gmail" });
  assert.deepEqual(ok, {
    ok: true,
    value: { text: "We keep the free tier for twenty seats.", source: "extension", context: { place_label: "Gmail" } },
  });
  const labelled = parseCheckBody({ text: "x y z", site: "jira", place_label: "Jira PRJ-12" });
  assert.equal(labelled.ok && labelled.value.context.place_label, "Jira PRJ-12");
  for (const body of [
    null,
    { text: "x", site: "slack" },
    { text: "", site: "docs" },
    { text: "x".repeat(4001), site: "docs" },
    { text: 42, site: "docs" },
    { text: "x", site: "docs", place_label: "p".repeat(121) },
  ]) {
    assert.equal(parseCheckBody(body as Record<string, unknown> | null).ok, false, JSON.stringify(body)?.slice(0, 60));
  }
});

test("a dismissal names a decision and the sentence", () => {
  assert.deepEqual(parseDismissBody({ decision_id: D.toUpperCase(), quote: " charge  above 20 " }), {
    ok: true,
    value: { decisionId: D, body: { quote: "charge above 20", source: "extension" } },
  });
  assert.equal(parseDismissBody({ decision_id: "nope", quote: "x" }).ok, false);
  assert.equal(parseDismissBody({ decision_id: D, quote: "" }).ok, false);
});

test("a reopen request passes only a safe place link", () => {
  const r = parseReopenBody({
    decision_id: D,
    quote: "charge above 20",
    place_label: "Google Docs: Pricing memo",
    link: "https://docs.google.com/document/d/x/edit",
  });
  assert.deepEqual(r, {
    ok: true,
    value: {
      decisionId: D,
      body: {
        quote: "charge above 20",
        source: "extension",
        place_label: "Google Docs: Pricing memo",
        link: "https://docs.google.com/document/d/x/edit",
      },
    },
  });
  assert.equal(parseReopenBody({ decision_id: D, quote: "q", link: "javascript:alert(1)" }).ok, false);
  assert.equal(parseReopenBody({ decision_id: D, quote: "q", link: "https://u:p@x.com/" }).ok, false);
  const noLink = parseReopenBody({ decision_id: D, quote: "q" });
  assert.equal(noLink.ok && "link" in noLink.value.body, false);
  assert.equal(safePlaceLink("http://localhost:3000/x"), "http://localhost:3000/x");
  assert.equal(safePlaceLink("http://example.com/x"), null);
});

test("gateway failures map to what the extension acts on", () => {
  assert.deepEqual(decisionsProblem(401, "AUTH_REQUIRED", null, null), { status: 401, body: { code: "LINK_EXPIRED" } });
  assert.deepEqual(decisionsProblem(429, "RATE_LIMITED", null, 12.2), {
    status: 429,
    body: { code: "RATE_LIMITED", retry_after: 13 },
    retryAfter: 13,
  });
  assert.equal(decisionsProblem(429, "RATE_LIMITED", null, null).retryAfter, 30);
  assert.deepEqual(decisionsProblem(503, "DEPENDENCY_UNAVAILABLE", "check_not_connected", null).body, { code: "CHECK_NOT_CONNECTED" });
  assert.deepEqual(decisionsProblem(409, "VERSION_CONFLICT", null, null), { status: 409, body: { code: "NOT_CONFIRMED" } });
  assert.equal(decisionsProblem(404, "NOT_FOUND", null, null).status, 404);
  assert.equal(decisionsProblem(500, "INTERNAL", null, null).status, 502);
});

test("the decision routes are public to Clerk but authenticate with the link token", () => {
  const mw = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
  assert.ok(mw.includes('"/api/capture/decisions(.*)"'));
  for (const route of ["check", "dismiss", "reopen"]) {
    const src = readFileSync(new URL(`../src/app/api/capture/decisions/${route}/route.ts`, import.meta.url), "utf8");
    assert.ok(src.indexOf("captureCaller(request)") < src.indexOf("gateway<"), route);
  }
});
