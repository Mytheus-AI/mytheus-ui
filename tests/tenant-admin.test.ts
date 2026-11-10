// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  grantState,
  isGrantDuration,
  isGrantScope,
  memberControls,
  parseSettingsForm,
  settingsToForm,
  type SettingsFormInput,
} from "../src/lib/tenant-admin.ts";

const blank = (): SettingsFormInput => ({
  retention_days_transcripts: "",
  retention_days_worklogs: "",
  pii_redaction_enabled: false,
  thresholds: {},
});

test("blank form means no retention limit and no overrides", () => {
  const r = parseSettingsForm(blank());
  assert.deepEqual(r, {
    ok: true,
    value: { retention_days_transcripts: null, retention_days_worklogs: null, pii_redaction_enabled: false, agent_confidence_overrides: {} },
  });
});

test("retention must be whole days in range", () => {
  assert.equal(parseSettingsForm({ ...blank(), retention_days_transcripts: " 90 " }).ok, true);
  for (const bad of ["0", "3651", "1.5", "-3", "ninety"]) {
    assert.equal(parseSettingsForm({ ...blank(), retention_days_worklogs: bad }).ok, false, bad);
  }
});

test("thresholds: partial override kept, bad numbers and inverted bands refused", () => {
  const ok = parseSettingsForm({ ...blank(), pii_redaction_enabled: true, thresholds: { DecisionAgent: { surface: "0.8", silent: "" } } });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.deepEqual(ok.value.agent_confidence_overrides, { DecisionAgent: { surface: 0.8 } });
    assert.equal(ok.value.pii_redaction_enabled, true);
  }
  assert.equal(parseSettingsForm({ ...blank(), thresholds: { ActionAgent: { surface: "1.2", silent: "" } } }).ok, false);
  assert.equal(parseSettingsForm({ ...blank(), thresholds: { ActionAgent: { surface: "0.5", silent: "0.6" } } }).ok, false);
  // silent alone above the default surface (0.7) is inverted too
  assert.equal(parseSettingsForm({ ...blank(), thresholds: { ActionAgent: { surface: "", silent: "0.75" } } }).ok, false);
  // unknown agents in the input are ignored
  const r = parseSettingsForm({ ...blank(), thresholds: { EvilAgent: { surface: "0.1", silent: "0" } } });
  assert.ok(r.ok && Object.keys(r.value.agent_confidence_overrides).length === 0);
});

test("settings round-trip through the form", () => {
  const s = {
    retention_days_transcripts: 30,
    retention_days_worklogs: null,
    pii_redaction_enabled: true,
    agent_confidence_overrides: { QuestionAgent: { surface: 0.9, silent: 0.5 } },
  };
  const back = parseSettingsForm(settingsToForm(s));
  assert.deepEqual(back, { ok: true, value: s });
});

test("grant state: revoked wins, then expiry", () => {
  const now = Date.parse("2026-11-10T12:00:00Z");
  assert.equal(grantState({ expires_at: "2026-11-11T00:00:00Z", revoked_at: null }, now), "active");
  assert.equal(grantState({ expires_at: "2026-11-10T11:59:59Z", revoked_at: null }, now), "expired");
  assert.equal(grantState({ expires_at: "2026-11-11T00:00:00Z", revoked_at: "2026-11-10T10:00:00Z" }, now), "revoked");
  assert.equal(grantState({ expires_at: "garbage", revoked_at: null }, now), "expired");
});

test("grant inputs and self-lockout guard", () => {
  assert.equal(isGrantScope("read_only"), true);
  assert.equal(isGrantScope("impersonate"), true);
  assert.equal(isGrantScope("root"), false);
  assert.equal(isGrantDuration(24), true);
  assert.equal(isGrantDuration(721), false);
  assert.deepEqual(memberControls({ isYou: true }), { canChangeTier: false, canRemove: false });
  assert.deepEqual(memberControls({ isYou: false }), { canChangeTier: true, canRemove: true });
});
