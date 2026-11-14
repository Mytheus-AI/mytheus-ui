// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { ago, askerStatus, cleanDraft, matchesProposal, peerIdOf, peerMyteName } from "../src/lib/ask-myte/peer.ts";

const ID = "77777777-7777-4777-8777-777777777777";
const samar = { id: "u-samar", name: "Samar Rihan", agent_name: null, agent_avatar_seed: null };

test("the teammate's Myte by name", () => {
  assert.equal(peerMyteName(samar), "Samar's Myte");
  assert.equal(peerMyteName({ ...samar, agent_name: "Bolt" }), "Bolt");
});

test("the draft goes out without citations", () => {
  assert.equal(cleanDraft("Pricing ships Friday [1]. Maya owns it [2] [3].  \nMore later [4] "), "Pricing ships Friday. Maya owns it.\nMore later");
});

test("what the asker sees", () => {
  assert.equal(askerStatus({ status: "pending", to_user: samar }), "Drafted when Samar next opens Mytheus. Nothing is sent until Samar reviews it.");
  assert.equal(askerStatus({ status: "declined", to_user: samar }), "Samar declined to answer.");
});

test("matching a sent question to its proposal", () => {
  assert.ok(matchesProposal({ question: "Where  is pricing?", to_user: samar }, { person_id: "u-samar", question: "where is pricing?" }));
  assert.equal(matchesProposal({ question: "x", to_user: samar }, { person_id: "u-maya", question: "x" }), false);
});

test("notification ids and ages", () => {
  assert.equal(peerIdOf(`mytepeer:${ID}`), ID);
  assert.equal(peerIdOf(`mytepeer:${ID}:answered`), ID);
  assert.equal(peerIdOf("reversal:x"), null);
  const now = Date.parse("2026-11-14T10:00:00Z");
  assert.equal(ago("2026-11-14T09:59:30Z", now), "just now");
  assert.equal(ago("2026-11-14T09:48:00Z", now), "12 min ago");
  assert.equal(ago("2026-11-12T10:00:00Z", now), "2 days ago");
});
