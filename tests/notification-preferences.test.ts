// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PREFERENCES, fromView, mergePreferences, toView } from "../src/lib/notification-preferences.ts";

test("missing rows fall back to the server defaults", () => {
  assert.deepEqual(mergePreferences(undefined), DEFAULT_PREFERENCES);
  assert.deepEqual(toView(mergePreferences([])), { emailEnabled: true, emailMode: "urgent" });
});

test("in-app is always on, whatever the server or a stale row says", () => {
  const prefs = mergePreferences([{ channel: "in_app", enabled: false, max_priority: 1 }]);
  assert.deepEqual(prefs[0], { channel: "in_app", enabled: true, max_priority: 3 });
});

test("email maps to urgent only (1) or all alerts (3); malformed values are ignored", () => {
  const prefs = mergePreferences([
    { channel: "email", enabled: false, max_priority: 3 },
    { channel: "fax", enabled: true, max_priority: 1 },
    { channel: "slack", enabled: "yes", max_priority: 9 },
  ]);
  assert.deepEqual(toView(prefs), { emailEnabled: false, emailMode: "all" });
  assert.deepEqual(prefs[2], { channel: "slack", enabled: false, max_priority: 1 });
});

test("saving keeps in-app on and Slack off until it is connected", () => {
  const rows = fromView({ emailEnabled: true, emailMode: "all" }, mergePreferences([{ channel: "slack", max_priority: 2 }]));
  assert.deepEqual(rows, [
    { channel: "in_app", enabled: true, max_priority: 3 },
    { channel: "email", enabled: true, max_priority: 3 },
    { channel: "slack", enabled: false, max_priority: 2 },
  ]);
  assert.equal(fromView({ emailEnabled: true, emailMode: "urgent" }, DEFAULT_PREFERENCES)[1].max_priority, 1);
});
