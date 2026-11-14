// Run: npm test
// Listening through the server: the recording format, the upload type, the rolling recorder's
// pre-roll (fake recorders and clock), the transcribe call and its failures in plain words.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_CLIP_BYTES,
  canRecord,
  createRollingRecorder,
  listenFailureFor,
  listenFailureNote,
  listenLanguage,
  micErrorNote,
  pickRecorderMime,
  transcribe,
  uploadType,
  type FetchLike,
  type Take,
} from "../src/lib/voice/listen.ts";

test("mime: Opus in WebM, then Opus in Ogg, then MP4; '' when none listed; null when it cannot record", () => {
  assert.equal(pickRecorderMime(() => true), "audio/webm;codecs=opus");
  assert.equal(
    pickRecorderMime((t) => t.startsWith("audio/ogg")),
    "audio/ogg;codecs=opus",
  );
  assert.equal(
    pickRecorderMime((t) => t === "audio/mp4"),
    "audio/mp4",
    "Safari",
  );
  assert.equal(
    pickRecorderMime(() => false),
    "",
  );
  assert.equal(
    pickRecorderMime((t) => {
      if (t.includes("webm")) throw new Error("boom");
      return t.includes("ogg");
    }),
    "audio/ogg;codecs=opus",
  );
  assert.equal(pickRecorderMime(null), null);
});

test("upload type: codecs dropped, aliases mapped, anything else refused", () => {
  assert.equal(uploadType("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(uploadType("audio/ogg; codecs=opus"), "audio/ogg");
  assert.equal(uploadType("audio/mp4"), "audio/mp4");
  assert.equal(uploadType("audio/x-m4a"), "audio/mp4");
  assert.equal(uploadType("video/webm"), "audio/webm");
  assert.equal(uploadType("audio/wav"), "audio/wav");
  assert.equal(uploadType("audio/mpeg"), "audio/mpeg");
  assert.equal(uploadType("text/plain"), null);
  assert.equal(uploadType(""), null);
  assert.equal(uploadType(null), null);
});

function fakeRecorders() {
  let clock = 0;
  const takes: { startedAt: number; state: "on" | "stopped" | "discarded"; id: number }[] = [];
  const open = (): Take => {
    const t = { startedAt: clock, state: "on" as "on" | "stopped" | "discarded", id: takes.length };
    takes.push(t);
    return {
      startedAt: t.startedAt,
      stop: async () => {
        t.state = "stopped";
        return new Blob([`take${t.id}`], { type: "audio/webm" });
      },
      discard: () => {
        t.state = "discarded";
      },
    };
  };
  const rec = createRollingRecorder({ open, now: () => clock, rotateMs: 2000 });
  const run = (ms: number) => {
    for (let i = 0; i < ms; i += 50) {
      clock += 50;
      rec.tick();
    }
  };
  return { rec, takes, run, live: () => takes.filter((t) => t.state === "on") };
}

test("rolling recorder: two staggered takes, so a clip always holds 1 to 2 s before the onset", () => {
  const f = fakeRecorders();
  f.rec.arm();
  assert.equal(f.live().length, 1);
  f.run(400);
  assert.equal(f.rec.preRollMs(), 400, "early on: everything since listening began");
  f.run(700);
  assert.equal(f.live().length, 2, "the second take starts half a rotation in");
  for (let i = 0; i < 40; i++) {
    f.run(150);
    const pre = f.rec.preRollMs();
    assert.ok(pre >= 1000 && pre < 2050, `pre-roll ${pre} ms`);
    assert.ok(f.live().length <= 2);
  }
});

test("rolling recorder: begin keeps the oldest take, finish hands back its whole clip", async () => {
  const f = fakeRecorders();
  f.rec.arm();
  f.run(3300);
  const live = f.live();
  const oldest = live.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
  f.rec.begin();
  assert.deepEqual(
    f.live().map((t) => t.id),
    [oldest.id],
    "the younger take is dropped",
  );
  f.run(5000);
  assert.equal(f.live().length, 1, "no rotation while someone talks");
  const clip = await f.rec.finish();
  assert.equal(await clip!.text(), `take${oldest.id}`);
  assert.equal(f.live().length, 0);
  assert.equal(f.rec.armed, false);
});

test("rolling recorder: cancel keeps nothing; arm again starts fresh", async () => {
  const f = fakeRecorders();
  f.rec.arm();
  f.run(1500);
  f.rec.begin();
  f.rec.cancel();
  assert.equal(f.live().length, 0);
  assert.equal(await f.rec.finish(), null);
  f.rec.arm();
  assert.equal(f.live().length, 1);
});

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; type: string; size: number }[] = [];
  const f: FetchLike = async (url, init) => {
    calls.push({ url, type: init.headers["Content-Type"]!, size: init.body.size });
    return { ok: status < 300, status, json: async () => body };
  };
  return { f, calls };
}

test("transcribe: sends the raw clip with its upload type and the language; tidies the words", async () => {
  const { f, calls } = fakeFetch(200, { text: "  what do I   owe this week \n" });
  const res = await transcribe(new Blob(["abc"], { type: "audio/webm;codecs=opus" }), { language: "en-GB", fetch: f });
  assert.deepEqual(res, { ok: true, text: "what do I owe this week" });
  assert.deepEqual(calls, [{ url: "/api/voice/transcribe?language=en", type: "audio/webm", size: 3 }]);
});

test("transcribe: failures by reason or status; too big and unknown types never leave", async () => {
  assert.deepEqual(await transcribe(new Blob(["a"], { type: "audio/ogg" }), { fetch: fakeFetch(503, { reason: "listening_not_connected" }).f }), { ok: false, reason: "listening_not_connected" });
  assert.deepEqual(await transcribe(new Blob(["a"], { type: "audio/ogg" }), { fetch: fakeFetch(429, null).f }), { ok: false, reason: "rate_limited" });
  assert.deepEqual(await transcribe(new Blob(["a"], { type: "audio/ogg" }), { fetch: fakeFetch(500, { reason: "weird" }).f }), { ok: false, reason: "listening_failed" });
  const none = fakeFetch(200, { text: "x" });
  assert.deepEqual(await transcribe(new Blob(["a"], { type: "text/plain" }), { fetch: none.f }), { ok: false, reason: "unsupported" });
  const big = { size: MAX_CLIP_BYTES + 1, type: "audio/webm" } as Blob;
  assert.deepEqual(await transcribe(big, { fetch: none.f }), { ok: false, reason: "too_long" });
  assert.equal(none.calls.length, 0);
  const offline: FetchLike = async () => {
    throw new Error("offline");
  };
  assert.deepEqual(await transcribe(new Blob(["a"], { type: "audio/mp4" }), { fetch: offline }), { ok: false, reason: "listening_not_connected" });
  const ctrl = new AbortController();
  ctrl.abort();
  assert.deepEqual(await transcribe(new Blob(["a"], { type: "audio/mp4" }), { fetch: offline, signal: ctrl.signal }), { ok: false, reason: "aborted" });
});

test("failures and microphone errors in plain words", () => {
  assert.equal(listenFailureFor(413, null), "too_long");
  assert.equal(listenFailureFor(401, null), "signed_out");
  assert.match(listenFailureNote("listening_not_connected"), /Listening is unavailable/);
  assert.match(listenFailureNote("rate_limited"), /Wait a few seconds/);
  assert.match(micErrorNote("NotAllowedError"), /blocked the microphone.*allow the microphone/);
  assert.match(micErrorNote("NotFoundError"), /No microphone was found/);
  assert.match(micErrorNote("NotReadableError"), /Another app/);
  assert.match(micErrorNote(undefined), /couldn't be started/);
  assert.equal(listenLanguage("en-US"), "en");
  assert.equal(listenLanguage(""), "en");
  assert.equal(listenLanguage("x"), "en");
});

test("canRecord needs a microphone API and MediaRecorder", () => {
  const getUserMedia = () => {};
  assert.equal(canRecord({ MediaRecorder: class {}, navigator: { mediaDevices: { getUserMedia } } }), true);
  assert.equal(canRecord({ navigator: { mediaDevices: { getUserMedia } } }), false);
  assert.equal(canRecord({ MediaRecorder: class {}, navigator: {} }), false);
  assert.equal(canRecord(undefined), false);
});
