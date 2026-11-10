import { test } from "node:test";
import assert from "node:assert/strict";

import { backoffMs, closeAction, isLinkMessage } from "../src/lib/protocol.ts";

test("close codes map to the right recovery", () => {
  assert.equal(closeAction(1000, false), "done");
  assert.equal(closeAction(4401, false), "refresh");
  for (const code of [1001, 1006, 1011, 4408]) assert.equal(closeAction(code, false), "retry", String(code));
  for (const code of [1007, 1008, 1009, 4400, 4403, 4409, 4451]) assert.equal(closeAction(code, false), "fatal", String(code));
  assert.equal(closeAction(1006, true), "done", "a close while stopping is the end");
});

test("backoff doubles to a 15 s ceiling, with jitter", () => {
  const mid = () => 0.5;
  assert.equal(backoffMs(0, mid), 1000);
  assert.equal(backoffMs(3, mid), 8000);
  assert.equal(backoffMs(10, mid), 15000);
  assert.equal(backoffMs(0, () => 0), 750);
  assert.equal(backoffMs(0, () => 1), 1250);
});

test("only a well-formed link message is accepted", () => {
  const good = {
    type: "mytheus.capture.link",
    token: "a.b.c",
    expiresAt: 1_800_000_000,
    account: { name: "Maya", email: "maya@example.com", organization: "Acme" },
  };
  assert.equal(isLinkMessage(good), true);
  assert.equal(isLinkMessage({ ...good, type: "other" }), false);
  assert.equal(isLinkMessage({ ...good, token: "not-a-jwt" }), false);
  assert.equal(isLinkMessage({ ...good, token: "a.b." + "c".repeat(5000) }), false);
  assert.equal(isLinkMessage({ ...good, account: undefined }), false);
  assert.equal(isLinkMessage(null), false);
  assert.equal(isLinkMessage("a.b.c"), false);
});
