// Run: npm test
// The briefing's voice: a pending recording is polled every 2 s for up to 20 s and played the
// moment it is ready; failed or too slow, the Myte speaks it live.
import assert from "node:assert/strict";
import { test } from "node:test";

import { AUDIO_POLL_MS, AUDIO_WAIT_MS, audioPlan, waitForAudio, type AudioStatus } from "../src/lib/briefing-audio.ts";

function clock() {
  let t = 0;
  const slept: number[] = [];
  return {
    now: () => t,
    sleep: async (ms: number) => {
      slept.push(ms);
      t += ms;
    },
    slept,
  };
}

test("plan: ready plays the file, pending waits, none and failed speak live", () => {
  assert.equal(audioPlan("ready"), "file");
  assert.equal(audioPlan("pending"), "wait");
  assert.equal(audioPlan("none"), "live");
  assert.equal(audioPlan("failed"), "live");
  assert.equal(audioPlan(undefined), "live");
});

test("pending -> ready: polls every 2 s and switches as soon as it is ready", async () => {
  const c = clock();
  const answers: AudioStatus[] = ["pending", "pending", "ready"];
  let polls = 0;
  const outcome = await waitForAudio({ poll: async () => answers[polls++]!, sleep: c.sleep, now: c.now });
  assert.equal(outcome, "ready");
  assert.equal(polls, 3);
  assert.deepEqual(c.slept, [AUDIO_POLL_MS, AUDIO_POLL_MS, AUDIO_POLL_MS]);
  assert.equal(c.now(), 6000);
});

test("still pending after 20 s: time out (live voice)", async () => {
  const c = clock();
  let polls = 0;
  const outcome = await waitForAudio({
    poll: async () => {
      polls++;
      return "pending";
    },
    sleep: c.sleep,
    now: c.now,
  });
  assert.equal(outcome, "timeout");
  assert.equal(polls, AUDIO_WAIT_MS / AUDIO_POLL_MS);
});

test("failed stops waiting at once; a poll that errors counts as still pending", async () => {
  const c = clock();
  let polls = 0;
  const outcome = await waitForAudio({
    poll: async () => {
      polls++;
      if (polls === 1) throw new Error("network");
      if (polls === 2) return null;
      return "failed";
    },
    sleep: c.sleep,
    now: c.now,
  });
  assert.equal(outcome, "failed");
  assert.equal(polls, 3);
});

test("leaving the player cancels the wait", async () => {
  const c = clock();
  const ctrl = new AbortController();
  const outcome = await waitForAudio({
    poll: async () => {
      ctrl.abort();
      return "pending";
    },
    sleep: c.sleep,
    now: c.now,
    signal: ctrl.signal,
  });
  assert.equal(outcome, "cancelled");
});
