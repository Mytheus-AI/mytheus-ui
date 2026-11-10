// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { legacyHref } from "../src/lib/legacy-routes.ts";

test("every moved route has a new home", () => {
  assert.equal(legacyHref("/tasks"), "/work/tasks");
  assert.equal(legacyHref("/promises"), "/work/promises");
  assert.equal(legacyHref("/status-requests"), "/work/updates");
  assert.equal(legacyHref("/notifications"), "/inbox?filter=notifications");
  assert.equal(legacyHref("/org"), "/people");
  assert.equal(legacyHref("/tenant"), "/workspace");
  assert.equal(legacyHref("/tenant/usage"), "/workspace/billing");
  assert.equal(legacyHref("/tenant/settings"), "/workspace/data");
  assert.equal(legacyHref("/billing"), "/workspace/billing");
  assert.equal(legacyHref("/settings"), "/settings/profile");
  assert.equal(legacyHref("/settings/agent"), "/agent");
});

test("the company brain keeps its section", () => {
  assert.equal(legacyHref("/tenant/brain"), "/workspace/brain");
  assert.equal(legacyHref("/tenant/brain/vocabulary"), "/workspace/brain/vocabulary");
  assert.equal(legacyHref("/tenant/brain/ground-rules/"), "/workspace/brain/ground-rules");
});

test("the query string is carried over, after the target's own", () => {
  assert.equal(legacyHref("/tasks", { new: "1" }), "/work/tasks?new=1");
  assert.equal(legacyHref("/notifications", { id: ["a", "b"] }), "/inbox?filter=notifications&id=a&id=b");
  assert.equal(legacyHref("/org", { q: "maya lee" }), "/people?q=maya%20lee");
});

test("paths that did not move are left alone", () => {
  assert.equal(legacyHref("/meetings"), null);
  assert.equal(legacyHref("/tenant/unknown"), null);
});
