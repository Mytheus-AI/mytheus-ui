// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkAskBody, memoriesFor, upstreamBody } from "../src/lib/ask-myte/upstream.ts";

const Q = "55555555-5555-4555-8555-555555555555";
const T = "66666666-6666-4666-8666-666666666666";
const persona = { name: "Pip", personality: "friendly" as const, instructions: null };

test("v2 body: attachments, memories and mode pass through, validated", () => {
  const r = checkAskBody({ question: "Summarise this", attachments: [{ name: "notes.md", text: "# Hi" }] });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.mode, "ask");
  const body = upstreamBody(r.value, persona, [], [{ id: "m1", text: "Prefers short answers" }]);
  assert.deepEqual(body.attachments, [{ name: "notes.md", text: "# Hi" }]);
  assert.deepEqual(body.memories, [{ id: "m1", text: "Prefers short answers" }]);
  assert.equal(body.mode, "ask");
  assert.equal("peer" in body, false);
});

test("attachments over the limits are refused, not trimmed", () => {
  assert.equal(checkAskBody({ question: "x", attachments: [1, 2, 3, 4].map((i) => ({ name: `${i}.txt`, text: "a" })) }).ok, false);
  assert.equal(checkAskBody({ question: "x", attachments: [{ name: "big.txt", text: "a".repeat(40_001) }] }).ok, false);
  assert.equal(checkAskBody({ question: "x", attachments: "nope" }).ok, false);
});

test("peer_answer: needs a real question id, uses the teammate's question, never a thread", () => {
  assert.equal(checkAskBody({ mode: "peer_answer", question: "", peer: { question_id: "x", question: "q" } }).ok, false);
  const r = checkAskBody({ mode: "peer_answer", question: "", thread_id: T, thread_title: "nope", peer: { question_id: Q, from_name: "Samar Rihan", question: "Where are we on pricing?" } });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.question, "Where are we on pricing?");
  assert.equal(r.value.threadId, null);
  assert.equal(r.value.threadTitle, null);
  const body = upstreamBody(r.value, persona, []);
  assert.equal(body.mode, "peer_answer");
  assert.deepEqual(body.peer, { question_id: Q, from_name: "Samar Rihan", question: "Where are we on pricing?" });
  assert.equal(body.want_title, false);
});

test("a routine run names its thread and does not ask for a title", () => {
  const r = checkAskBody({ question: "What changed in pricing?", thread_title: "  Monday   update: pricing " });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.threadTitle, "Monday update: pricing");
  assert.equal(upstreamBody(r.value, persona, []).want_title, false);
});

test("memories: at most 30, clean text only", () => {
  const items = [{ id: "a", text: "  likes tables " }, { id: 1, text: "x" }, { id: "b", text: "" }, ...Array.from({ length: 40 }, (_, i) => ({ id: `m${i}`, text: "t" }))];
  const m = memoriesFor({ items });
  assert.equal(m.length, 30);
  assert.deepEqual(m[0], { id: "a", text: "likes tables" });
  assert.deepEqual(memoriesFor(null), []);
});
