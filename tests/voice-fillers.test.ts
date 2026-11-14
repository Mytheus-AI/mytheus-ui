// Run: npm test
// Talk mode's spoken fillers with a fake clock and fake events: the acknowledgment at once, one
// step filler after it, the slow-path line, at most two, never the same twice in a row, never once
// the answer has started.
import assert from "node:assert/strict";
import { test } from "node:test";

import { ACKS, FILLER_PHRASES, STEP_FILLERS, createFillerScheduler, fillerKindFor } from "../src/lib/voice/fillers.ts";

const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length]!;
};

test("step labels map to what it is doing", () => {
  assert.equal(fillerKindFor("Searching your meetings"), "meetings");
  assert.equal(fillerKindFor("Found the meeting"), "meetings");
  assert.equal(fillerKindFor("Read 2 decisions"), "decisions");
  assert.equal(fillerKindFor("Checked your tasks"), "tasks");
  assert.equal(fillerKindFor("Looking at your promises"), "tasks");
  assert.equal(fillerKindFor("Reading your calendar"), "schedule");
  assert.equal(fillerKindFor("Checking your capacity"), "schedule");
  assert.equal(fillerKindFor("Looking up people"), "people");
  assert.equal(fillerKindFor("Searching the help docs"), "brain");
  assert.equal(fillerKindFor("Reading the company brain"), "brain");
  assert.equal(fillerKindFor("Thinking"), "generic");
  assert.equal(new Set(FILLER_PHRASES).size, FILLER_PHRASES.length, "every phrase once");
});

test("a full turn: acknowledgment at once, the step filler after it ends, then the answer", () => {
  const f = createFillerScheduler({ random: seq(0) });
  const ack = f.begin(0);
  assert.deepEqual(ack, { kind: "ack", phrase: ACKS[0] });
  // The step arrives while the acknowledgment is still playing: it waits.
  assert.equal(f.step("Reading your calendar", 300), null);
  const next = f.ended(700);
  assert.deepEqual(next, { kind: "schedule", phrase: STEP_FILLERS.schedule });
  // A second step never adds another filler.
  f.ended(1900);
  assert.equal(f.step("Checked your tasks", 2000), null);
  // Two fillers played: the slow line never comes.
  assert.equal(f.tick(6000), null);
});

test("answer text first: the step filler is dropped, nothing else plays", () => {
  const f = createFillerScheduler({ random: seq(0) });
  f.begin(0);
  f.step("Searching your meetings", 200);
  f.text();
  assert.equal(f.ended(600), null);
  assert.equal(f.tick(5000), null);
});

test("the step arrives after the acknowledgment ended: the filler plays at once", () => {
  const f = createFillerScheduler({ random: seq(0) });
  f.begin(0);
  f.ended(600);
  assert.deepEqual(f.step("Looking up people", 900), { kind: "people", phrase: STEP_FILLERS.people });
});

test("slow path: about 4 s with no answer text and no step filler", () => {
  const f = createFillerScheduler({ random: seq(0) });
  f.begin(0);
  f.ended(600);
  assert.equal(f.tick(3900), null);
  assert.deepEqual(f.tick(4000), { kind: "slow", phrase: STEP_FILLERS.slow });
  f.ended(5500);
  assert.equal(f.tick(9000), null, "at most two in a turn");
  assert.equal(f.step("Checked your tasks", 9100), null);
});

test("never the same phrase twice in a row, across turns", () => {
  const f = createFillerScheduler({ random: seq(0) });
  const phrases: string[] = [];
  for (let t = 0; t < 6; t++) {
    const a = f.begin(t * 10_000);
    if (a) phrases.push(a.phrase);
    f.ended(t * 10_000 + 500);
    f.end();
  }
  for (let i = 1; i < phrases.length; i++) assert.notEqual(phrases[i], phrases[i - 1]);
  assert.equal(phrases.length, 6);
});

test("a phrase not rendered yet is skipped, and does not count", () => {
  const ready = new Set<string>([STEP_FILLERS.tasks]);
  const f = createFillerScheduler({ ready: (p) => ready.has(p), random: seq(0) });
  assert.equal(f.begin(0), null, "no acknowledgment ready");
  assert.deepEqual(f.step("Checked your tasks", 100), { kind: "tasks", phrase: STEP_FILLERS.tasks });
});

test("generic step filler after 'Okay, let me check.' is skipped as a repeat", () => {
  const f = createFillerScheduler({ random: seq(0.5) });
  const a = f.begin(0);
  assert.equal(a!.phrase, "Okay, let me check.");
  f.ended(700);
  assert.equal(f.step("Thinking", 900), null);
});

test("after end, nothing plays until the next turn begins", () => {
  const f = createFillerScheduler({ random: seq(0) });
  f.begin(0);
  f.end();
  assert.equal(f.step("Checked your tasks", 100), null);
  assert.equal(f.tick(9000), null);
});

/* ---------------- the filler bank ---------------- */

import { createFillerBank } from "../src/lib/voice/filler-bank.ts";
import type { ChunkResponse } from "../src/lib/voice/speaker.ts";

const tick = () => new Promise((r) => setTimeout(r, 0));
const flush = async (n = 8) => {
  for (let i = 0; i < n; i++) await tick();
};

test("bank: warms phrases two at a time, in order, once; get answers only what is ready", async () => {
  const asked: { text: string; speed: number; resolve: (r: ChunkResponse) => void }[] = [];
  const bank = createFillerBank({
    fetchChunk: (body) => new Promise<ChunkResponse>((resolve) => asked.push({ text: body.text, speed: body.speed, resolve })),
    decode: async (data) => ({ duration: data.byteLength / 10 }),
  });
  const ok = (n: number): ChunkResponse => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(n), json: async () => null });
  bank.warm(["Got it.", "Okay, let me check.", "Sure, one sec."], { speed: 1.1 });
  await flush();
  assert.deepEqual(asked.map((a) => a.text), ["Got it.", "Okay, let me check."]);
  assert.equal(asked[0]!.speed, 1.1);
  assert.equal(bank.get("Got it.", 1.1), null);
  asked[0]!.resolve(ok(10));
  await flush();
  assert.equal(bank.get("Got it.", 1.1)!.duration, 1);
  assert.equal(bank.ready("Got it.", 1), false, "keyed by speed");
  assert.equal(asked.length, 3);
  // Warming again asks only for what is missing.
  bank.warm(["Got it.", "Sure, one sec."], { speed: 1.1 });
  await flush();
  assert.equal(asked.length, 3);
  bank.clear();
  assert.equal(bank.ready("Got it.", 1.1), false);
});

test("bank: a rate limit stops warming quietly", async () => {
  const asked: string[] = [];
  const bank = createFillerBank({
    fetchChunk: async (body) => {
      asked.push(body.text);
      return { ok: false, status: 429, arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({ reason: "rate_limited" }) };
    },
    decode: async () => ({ duration: 1 }),
  });
  bank.warm(["a.", "b.", "c.", "d.", "e."], { concurrency: 1 });
  await flush();
  assert.deepEqual(asked, ["a."]);
});
