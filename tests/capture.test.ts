// Run: npm test
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  capturedTitle,
  cleanCaptureTitle,
  isCaptureSource,
  parseCapturedTitle,
} from "../src/app/api/capture/_lib/source.ts";
import {
  CAPTURE_TOKEN_TTL_SECONDS,
  normalizeConsentAt,
  signCaptureToken,
  signLinkToken,
  verifyLinkToken,
} from "../src/app/api/capture/_lib/tokens.ts";

const SECRET = "s".repeat(48);
const NOW = 1_800_000_000;

function decode(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as Record<string, unknown>;
}

test("a captured meeting's title carries its source and reads back", () => {
  assert.equal(capturedTitle("meet", "Weekly sync"), "Google Meet: Weekly sync");
  assert.equal(capturedTitle("teams", "  "), "Microsoft Teams: Call");
  assert.deepEqual(parseCapturedTitle("Zoom: Acme renewal"), { source: "zoom", title: "Acme renewal" });
  assert.deepEqual(parseCapturedTitle(capturedTitle("teams", "Q4 plan")), { source: "teams", title: "Q4 plan" });
  assert.equal(parseCapturedTitle("Weekly sync"), null);
  assert.equal(parseCapturedTitle(null), null);
  assert.equal(isCaptureSource("meet"), true);
  assert.equal(isCaptureSource("webex"), false);
});

test("titles are single-line, printable and bounded", () => {
  assert.equal(cleanCaptureTitle("  Sprint\n\treview‮ "), "Sprint review");
  assert.equal(cleanCaptureTitle(42), "");
  assert.equal(cleanCaptureTitle("x".repeat(500)).length, 120);
});

test("the capture token has exactly the claims transcription-service verifies", () => {
  const { token, expiresAt } = signCaptureToken(
    {
      userId: "0b6f5f3e-0000-4000-8000-000000000001",
      orgId: "0b6f5f3e-0000-4000-8000-000000000002",
      meetingId: "0b6f5f3e-0000-4000-8000-000000000003",
      source: "meet",
      consentAt: "2026-11-11T09:30:00.000Z",
    },
    SECRET,
    NOW,
  );
  const [header, body, signature] = token.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), { alg: "HS256", typ: "JWT" });
  assert.equal(signature, createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url"));
  assert.deepEqual(decode(token), {
    typ: "capture",
    iss: "mytheus-ui",
    aud: "transcription-service",
    sub: "0b6f5f3e-0000-4000-8000-000000000001",
    org: "0b6f5f3e-0000-4000-8000-000000000002",
    mid: "0b6f5f3e-0000-4000-8000-000000000003",
    src: "meet",
    consent_at: "2026-11-11T09:30:00.000Z",
    iat: NOW,
    exp: NOW + CAPTURE_TOKEN_TTL_SECONDS,
  });
  assert.equal(expiresAt, NOW + 900);
});

test("a link token verifies, and nothing else passes for one", () => {
  const { token } = signLinkToken({ sessionId: "sess_1", clerkUserId: "user_1", extensionId: "a".repeat(32) }, SECRET, NOW);
  const claims = verifyLinkToken(token, SECRET, NOW + 60);
  assert.equal(claims?.sid, "sess_1");
  assert.equal(claims?.sub, "user_1");
  assert.equal(verifyLinkToken(token, "t".repeat(48), NOW), null, "another secret");
  assert.equal(verifyLinkToken(token, SECRET, NOW + 8 * 24 * 3600), null, "expired");
  const capture = signCaptureToken(
    { userId: "u", orgId: "o", meetingId: "m", source: "meet", consentAt: "x" },
    SECRET,
    NOW,
  ).token;
  assert.equal(verifyLinkToken(capture, SECRET, NOW), null, "a capture token is not a link token");
  const [h, b] = token.split(".");
  assert.equal(verifyLinkToken(`${h}.${b}.`, SECRET, NOW), null, "unsigned");
  assert.equal(verifyLinkToken("garbage", SECRET, NOW), null);
});

test("consent times must be real, recent and not in the future", () => {
  const now = Date.parse("2026-11-11T10:00:00Z");
  assert.equal(normalizeConsentAt("2026-11-11T09:30:00Z", now), "2026-11-11T09:30:00.000Z");
  assert.equal(normalizeConsentAt("2026-11-11T11:00:00Z", now), null);
  assert.equal(normalizeConsentAt("2026-11-09T09:30:00Z", now), null);
  assert.equal(normalizeConsentAt("soon", now), null);
  assert.equal(normalizeConsentAt(undefined, now), null);
});

test("the dashboard's default extension id is the one the extension's key derives", () => {
  const config = readFileSync(new URL("../src/app/api/capture/_lib/config.ts", import.meta.url), "utf8");
  const identity = readFileSync(new URL("../extension/src/lib/identity.ts", import.meta.url), "utf8");
  const appId = /DEFAULT_EXTENSION_ID = "([a-p]{32})"/.exec(config)?.[1];
  const extId = /EXTENSION_ID = "([a-p]{32})"/.exec(identity)?.[1];
  assert.ok(appId && extId);
  assert.equal(appId, extId);
});
