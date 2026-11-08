// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { hostRedirect, isMarketingPath, requestHost } from "../src/lib/hosts.ts";

const cfg = { appHost: "dashboard.mytheus.cloud", marketingOrigin: "https://mytheus.cloud" };

test("marketing paths", () => {
  for (const p of ["/", "/pricing", "/privacy", "/students/verify", "/blog/x"]) {
    assert.equal(isMarketingPath(p), true, p);
  }
  for (const p of ["/dashboard", "/meetings/abc", "/sign-in", "/pricingx", "/onboarding"]) {
    assert.equal(isMarketingPath(p), false, p);
  }
});

test("apex keeps marketing and sends app and auth routes to the app host", () => {
  assert.equal(hostRedirect("mytheus.cloud", "/", "", cfg), null);
  assert.equal(hostRedirect("www.mytheus.cloud", "/pricing", "", cfg), null);
  assert.equal(
    hostRedirect("mytheus.cloud", "/sign-in", "?redirect_url=x", cfg),
    "https://dashboard.mytheus.cloud/sign-in?redirect_url=x",
  );
  assert.equal(
    hostRedirect("www.mytheus.cloud", "/meetings/abc", "", cfg),
    "https://dashboard.mytheus.cloud/meetings/abc",
  );
});

test("app host opens the dashboard and sends marketing pages to the apex", () => {
  assert.equal(hostRedirect("dashboard.mytheus.cloud", "/", "", cfg), "https://dashboard.mytheus.cloud/dashboard");
  assert.equal(hostRedirect("dashboard.mytheus.cloud", "/meetings", "", cfg), null);
  assert.equal(hostRedirect("dashboard.mytheus.cloud", "/sign-up/verify", "", cfg), null);
  assert.equal(hostRedirect("dashboard.mytheus.cloud", "/pricing", "?a=1", cfg), "https://mytheus.cloud/pricing?a=1");
});

test("no app host or a local host means no redirects", () => {
  assert.equal(hostRedirect("mytheus.cloud", "/dashboard", "", { appHost: "", marketingOrigin: "" }), null);
  assert.equal(hostRedirect("localhost", "/dashboard", "", cfg), null);
  assert.equal(hostRedirect("127.0.0.1", "/", "", cfg), null);
});

test("request host prefers X-Forwarded-Host and drops the port", () => {
  const h = (m: Record<string, string>) => ({ get: (n: string) => m[n] ?? null });
  assert.equal(requestHost(h({ host: "mytheus-webapp:3000", "x-forwarded-host": "Dashboard.Mytheus.Cloud" })), "dashboard.mytheus.cloud");
  assert.equal(requestHost(h({ host: "localhost:3000" })), "localhost");
});
