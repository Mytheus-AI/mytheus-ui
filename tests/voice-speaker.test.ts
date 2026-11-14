// Run: npm test
// The Myte's speech engine (ADR-0050 D4) with a fake network and a fake audio output: chunk 0
// first, N+1 fetched while N plays, one speaker app-wide, pause/resume/stop, failures that never
// fall back to another voice, and the back-off after the voice server is off.
import assert from "node:assert/strict";
import { test } from "node:test";

import { createSpeaker, UNAVAILABLE_BACKOFF_MS, type AudioOut, type ChunkResponse, type Clip, type FetchChunk } from "../src/lib/voice/speaker.ts";

const tick = () => new Promise((r) => setTimeout(r, 0));
const flush = async (n = 6) => {
  for (let i = 0; i < n; i++) await tick();
};

type Pending = { text: string; voice?: string; speed: number; resolve: (r: ChunkResponse) => void; reject: (e: unknown) => void; signal: AbortSignal };

function harness(opts: { unlock?: boolean } = {}) {
  const requests: Pending[] = [];
  const fetchChunk: FetchChunk = (body, signal) =>
    new Promise<ChunkResponse>((resolve, reject) => {
      requests.push({ ...body, resolve, reject, signal });
      signal.addEventListener("abort", () => reject(new Error("aborted")));
    });
  const playing: { text: string; end: () => void; stopped: boolean }[] = [];
  const log: string[] = [];
  const out: AudioOut = {
    decode: async (data) => ({ duration: 2, text: new TextDecoder().decode(data) }) as Clip & { text: string },
    play(clip, onEnded) {
      const p = { text: (clip as Clip & { text: string }).text, end: onEnded, stopped: false };
      playing.push(p);
      log.push(`play:${p.text}`);
      return {
        stop() {
          p.stopped = true;
          log.push(`stop:${p.text}`);
        },
        elapsed: () => 1,
      };
    },
    unlock: async () => opts.unlock ?? true,
    pause: () => log.push("pause"),
    resume: () => log.push("resume"),
    level: () => 0.5,
  };
  let clock = 1000;
  const speaker = createSpeaker({ fetchChunk, out: () => out, now: () => clock });
  const ok = (text: string): ChunkResponse => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer as ArrayBuffer,
    json: async () => null,
  });
  const err = (status: number, body: unknown): ChunkResponse => ({ ok: false, status, arrayBuffer: async () => new ArrayBuffer(0), json: async () => body });
  return { speaker, requests, playing, log, ok, err, advance: (ms: number) => (clock += ms) };
}

const TEXT = "First thing. Second thing is here. Third thing follows.";

test("chunk 0 alone first; chunk 1 is fetched as soon as chunk 0 arrives; plays to the end", async () => {
  const h = harness();
  const states: string[] = [];
  h.speaker.subscribe(() => states.push(h.speaker.getSnapshot().status));
  const done = h.speaker.speak({ key: "a", text: TEXT, speed: 1.1 });
  await flush();
  assert.equal(h.requests.length, 1, "only the first chunk is asked for");
  assert.equal(h.requests[0]!.text, "First thing.");
  assert.equal(h.requests[0]!.speed, 1.1);
  assert.equal(h.requests[0]!.voice, undefined, "no voice: core-api uses the person's own");
  assert.equal(h.speaker.getSnapshot().status, "loading");

  h.requests[0]!.resolve(h.ok("c0"));
  await flush();
  assert.equal(h.speaker.getSnapshot().status, "speaking");
  assert.deepEqual(h.log, ["play:c0"]);
  assert.equal(h.requests.length, 2, "the next chunk renders while this one plays");
  assert.equal(h.speaker.level(), 0.5);
  assert.deepEqual(h.speaker.position(), { chunk: 0, chunks: 2, fraction: (12 * 0.5) / (12 + 42) });

  h.requests[1]!.resolve(h.ok("c1"));
  await flush();
  h.playing[0]!.end();
  await flush();
  assert.deepEqual(h.log, ["play:c0", "play:c1"]);
  h.playing[1]!.end();
  assert.equal(await done, "ended");
  assert.equal(h.speaker.getSnapshot().status, "idle");
  assert.equal(h.speaker.level(), 0);
  assert.ok(states.includes("loading") && states.includes("speaking"));
});

test("a preview names its voice", async () => {
  const h = harness();
  void h.speaker.speak({ key: "preview:bm_george", text: "Hi, I'm Pip.", voice: "bm_george" });
  await flush();
  assert.equal(h.requests[0]!.voice, "bm_george");
});

test("one speaker app-wide: a new speak stops the old one and aborts its requests", async () => {
  const h = harness();
  const first = h.speaker.speak({ key: "a", text: TEXT });
  await flush();
  h.requests[0]!.resolve(h.ok("a0"));
  await flush();
  const second = h.speaker.speak({ key: "b", text: "Other words." });
  assert.equal(await first, "stopped");
  assert.ok(h.requests[1]!.signal.aborted, "the prefetch is aborted");
  assert.ok(h.playing[0]!.stopped, "the sound stops");
  assert.equal(h.speaker.getSnapshot().key, "b");
  await flush();
  h.requests[2]!.resolve(h.ok("b0"));
  await flush();
  h.playing[1]!.end();
  assert.equal(await second, "ended");
});

test("pause holds the sound, resume carries on, stop by key", async () => {
  const h = harness();
  const done = h.speaker.speak({ key: "a", text: "Only one." });
  await flush();
  h.requests[0]!.resolve(h.ok("x"));
  await flush();
  h.speaker.pause();
  assert.equal(h.speaker.getSnapshot().status, "paused");
  assert.equal(h.speaker.level(), 0);
  h.speaker.resume();
  assert.equal(h.speaker.getSnapshot().status, "speaking");
  assert.deepEqual(h.log, ["play:x", "pause", "resume"]);
  h.speaker.stop("someone-else");
  assert.equal(h.speaker.getSnapshot().status, "speaking", "another key does not stop it");
  h.speaker.stop("a");
  assert.equal(await done, "stopped");
  assert.equal(h.speaker.getSnapshot().status, "idle");
});

test("503: error with voice_not_connected, no other voice, and no new request for a while", async () => {
  const h = harness();
  const done = h.speaker.speak({ key: "a", text: TEXT });
  await flush();
  h.requests[0]!.resolve(h.err(503, { reason: "voice_not_connected" }));
  assert.equal(await done, "error");
  assert.deepEqual(h.speaker.getSnapshot(), { status: "error", key: "a", error: "voice_not_connected", chunk: 0, chunks: 2 });
  assert.deepEqual(h.log, [], "nothing played");

  assert.equal(await h.speaker.speak({ key: "b", text: "Again." }), "error");
  assert.equal(h.requests.length, 1, "backing off: not asked again");
  h.advance(UNAVAILABLE_BACKOFF_MS + 1);
  void h.speaker.speak({ key: "c", text: "Again." });
  await flush();
  assert.equal(h.requests.length, 2, "asked again after the back-off");
});

test("429 and network failures report their own reasons; stop clears an error", async () => {
  const h = harness();
  const a = h.speaker.speak({ key: "a", text: "Hello there." });
  await flush();
  h.requests[0]!.resolve(h.err(429, { reason: "rate_limited" }));
  assert.equal(await a, "error");
  assert.equal(h.speaker.getSnapshot().error, "rate_limited");
  h.speaker.stop("a");
  assert.equal(h.speaker.getSnapshot().status, "idle");

  const b = h.speaker.speak({ key: "b", text: "Hello there." });
  await flush();
  h.requests[1]!.reject(new TypeError("fetch failed"));
  assert.equal(await b, "error");
  assert.equal(h.speaker.getSnapshot().error, "voice_not_connected");
});

test("a failure mid-way stops with an error after what was already said", async () => {
  const h = harness();
  const done = h.speaker.speak({ key: "a", text: TEXT });
  await flush();
  h.requests[0]!.resolve(h.ok("c0"));
  await flush();
  h.requests[1]!.resolve(h.err(500, null));
  await flush();
  h.playing[0]!.end();
  assert.equal(await done, "error");
  assert.equal(h.speaker.getSnapshot().error, "voice_failed");
  assert.equal(h.speaker.getSnapshot().chunk, 0);
});

test("autoplay refused: blocked, so the caller can ask for a press", async () => {
  const h = harness({ unlock: false });
  const done = h.speaker.speak({ key: "a", text: "Hi." });
  await flush();
  h.requests[0]!.resolve(h.ok("x"));
  assert.equal(await done, "error");
  assert.equal(h.speaker.getSnapshot().error, "blocked");
  assert.deepEqual(h.log, []);
});

test("nothing to say resolves at once without a request", async () => {
  const h = harness();
  assert.equal(await h.speaker.speak({ key: "a", text: "[1] [2]" }), "ended");
  assert.equal(h.requests.length, 0);
});

test("speed changes apply to chunks not yet asked for", async () => {
  const h = harness();
  void h.speaker.speak({ key: "a", text: TEXT, speed: 1 });
  await flush();
  h.speaker.setSpeed(1.2);
  h.requests[0]!.resolve(h.ok("c0"));
  await flush();
  assert.equal(h.requests[0]!.speed, 1);
  assert.equal(h.requests[1]!.speed, 1.2);
});
