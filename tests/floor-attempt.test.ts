// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_PER_VISIT,
  initialFloor,
  stepFloor,
  type FloorAttempt,
  type FloorInput,
  type FloorState,
} from "../src/lib/realtime/floor-attempt.ts";

/** Play a timeline of inputs (each held from its `at` until the next), stepping every 100 ms. */
function play(events: (Omit<FloorInput, "now"> & { at: number })[], until: number, start: FloorState = initialFloor(false)) {
  let s = start;
  const attempts: FloorAttempt[] = [];
  let i = 0;
  let cur = events[0];
  for (let now = events[0].at; now <= until; now += 100) {
    while (i + 1 < events.length && events[i + 1].at <= now) {
      i += 1;
      cur = events[i];
    }
    const r = stepFloor(s, { now, micOn: cur.micOn, speaking: cur.speaking, otherSpeakerId: cur.otherSpeakerId });
    s = r.state;
    if (r.attempt) attempts.push(r.attempt);
  }
  return { attempts, state: s };
}

const RAJ = "u-raj";

test("a short burst over someone who keeps talking is an attempt", () => {
  const { attempts } = play(
    [
      { at: 0, micOn: true, speaking: false, otherSpeakerId: RAJ },
      { at: 2000, micOn: true, speaking: true, otherSpeakerId: RAJ },
      { at: 3200, micOn: true, speaking: false, otherSpeakerId: RAJ },
    ],
    6000,
  );
  assert.equal(attempts.length, 1);
  assert.deepEqual(attempts[0], { startedAt: 2000, endedAt: 3200, overUserId: RAJ, unmutedAt: 0 });
});

test("getting the floor (a long burst) is not an attempt", () => {
  const { attempts } = play(
    [
      { at: 0, micOn: true, speaking: false, otherSpeakerId: RAJ },
      { at: 1000, micOn: true, speaking: true, otherSpeakerId: RAJ },
      { at: 2000, micOn: true, speaking: true, otherSpeakerId: null },
      { at: 6000, micOn: true, speaking: false, otherSpeakerId: null },
    ],
    9000,
  );
  assert.equal(attempts.length, 0);
});

test("speaking into silence is not an attempt", () => {
  const { attempts } = play(
    [
      { at: 0, micOn: true, speaking: false, otherSpeakerId: null },
      { at: 500, micOn: true, speaking: true, otherSpeakerId: null },
      { at: 1200, micOn: true, speaking: false, otherSpeakerId: null },
    ],
    4000,
  );
  assert.equal(attempts.length, 0);
});

test("a short burst after which the other person stops is not an attempt (they yielded)", () => {
  const { attempts } = play(
    [
      { at: 0, micOn: true, speaking: false, otherSpeakerId: RAJ },
      { at: 1000, micOn: true, speaking: true, otherSpeakerId: RAJ },
      { at: 2000, micOn: true, speaking: false, otherSpeakerId: null },
    ],
    5000,
  );
  assert.equal(attempts.length, 0);
});

test("unmuting and muting again within 10 s while someone talks is an attempt (you gave up)", () => {
  const { attempts } = play(
    [
      { at: 0, micOn: false, speaking: false, otherSpeakerId: RAJ },
      { at: 1000, micOn: true, speaking: false, otherSpeakerId: RAJ },
      { at: 4000, micOn: false, speaking: false, otherSpeakerId: RAJ },
    ],
    6000,
  );
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].unmutedAt, 1000);
  assert.equal(attempts[0].startedAt, 1000);
  assert.equal(attempts[0].endedAt, 4000);
});

test("muting after speaking your piece is not an attempt", () => {
  const { attempts } = play(
    [
      { at: 0, micOn: false, speaking: false, otherSpeakerId: null },
      { at: 1000, micOn: true, speaking: true, otherSpeakerId: null },
      { at: 5000, micOn: true, speaking: false, otherSpeakerId: RAJ },
      { at: 6000, micOn: false, speaking: false, otherSpeakerId: RAJ },
    ],
    8000,
  );
  assert.equal(attempts.length, 0);
});

test("attempts are spaced 5 s apart and capped per visit", () => {
  // Two short bursts 2 s apart: only the first is reported.
  const { attempts } = play(
    [
      { at: 0, micOn: true, speaking: false, otherSpeakerId: RAJ },
      { at: 1000, micOn: true, speaking: true, otherSpeakerId: RAJ },
      { at: 1500, micOn: true, speaking: false, otherSpeakerId: RAJ },
      { at: 3000, micOn: true, speaking: true, otherSpeakerId: RAJ },
      { at: 3500, micOn: true, speaking: false, otherSpeakerId: RAJ },
    ],
    8000,
  );
  assert.equal(attempts.length, 1);
  const capped = { ...initialFloor(true), sent: MAX_PER_VISIT };
  const r = play(
    [
      { at: 0, micOn: true, speaking: false, otherSpeakerId: RAJ },
      { at: 1000, micOn: true, speaking: true, otherSpeakerId: RAJ },
      { at: 1500, micOn: true, speaking: false, otherSpeakerId: RAJ },
    ],
    5000,
    capped,
  );
  assert.equal(r.attempts.length, 0);
});
