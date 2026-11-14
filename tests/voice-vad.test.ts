// Run: npm test
// Voice-activity detection with fake levels and a fake clock (one reading every 50 ms):
// calibration, onset debounce, the 1.2 s end of speech, the 30 s cap, short blips, hysteresis.
import assert from "node:assert/strict";
import { test } from "node:test";

import { createVad, thresholdsFor, VAD_DEFAULTS, type Vad, type VadEvent } from "../src/lib/voice/vad.ts";

const STEP = 50;

/** Feed `level` for `ms`, from `at`; returns the events with their times and the next time. */
function feed(vad: Vad, at: number, ms: number, level: number | (() => number)) {
  const events: { ev: VadEvent; at: number }[] = [];
  let t = at;
  for (; t < at + ms; t += STEP) {
    const ev = vad.push(typeof level === "number" ? level : level(), t);
    if (ev) events.push({ ev, at: t });
  }
  return { events, at: t };
}

function calibrated(floor = 0.02) {
  const vad = createVad();
  vad.reset(0);
  const r = feed(vad, 0, VAD_DEFAULTS.calibrateMs + STEP, floor);
  assert.equal(vad.calibrating, false);
  assert.deepEqual(r.events, []);
  return { vad, at: r.at };
}

test("the first 500 ms measure the room; nothing starts while calibrating, even loud", () => {
  const vad = createVad();
  vad.reset(1000);
  const r = feed(vad, 1000, 450, 0.9);
  assert.deepEqual(r.events, []);
  assert.equal(vad.calibrating, true);
  // The floor is capped so someone already talking does not make it deaf.
  feed(vad, r.at, 100, 0.9);
  assert.ok(vad.thresholds().speech <= thresholdsFor(0.12).speech + 1e-9);
});

test("thresholds follow the floor, with hysteresis, within bounds", () => {
  const quiet = thresholdsFor(0.01);
  assert.equal(quiet.speech, 0.08);
  assert.ok(quiet.silence < quiet.speech);
  const noisy = thresholdsFor(0.1);
  assert.ok(noisy.speech > quiet.speech);
  assert.ok(noisy.silence <= noisy.speech * 0.75 + 1e-9);
  assert.ok(thresholdsFor(1).speech <= 0.4);
});

test("speech starts after 100 ms above the threshold; a 50 ms click does not start it", () => {
  const { vad, at } = calibrated();
  const click = feed(vad, at, 50, 0.6);
  assert.deepEqual(click.events, []);
  const gap = feed(vad, click.at, 200, 0.02);
  const talk = feed(vad, gap.at, 300, 0.4);
  assert.equal(talk.events[0]?.ev, "start");
  assert.equal(talk.events[0]!.at - gap.at, 100, "onset after 100 ms");
  assert.equal(vad.speaking, true);
});

test("it ends after 1.2 s of quiet; a short pause in the middle does not end it", () => {
  const { vad, at } = calibrated();
  let r = feed(vad, at, 600, 0.4);
  assert.equal(r.events[0]?.ev, "start");
  r = feed(vad, r.at, 800, 0.02); // a breath
  assert.deepEqual(r.events, []);
  // Level between the silence and speech thresholds still counts as voice (hysteresis).
  const th = vad.thresholds();
  r = feed(vad, r.at, 600, (th.silence + th.speech) / 2);
  assert.deepEqual(r.events, []);
  const quietFrom = r.at;
  r = feed(vad, r.at, 2000, 0.02);
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0]!.ev, "end");
  const quietFor = r.events[0]!.at - quietFrom;
  assert.ok(quietFor >= 1150 && quietFor <= 1250, `ended after ${quietFor} ms of quiet`);
  assert.equal(vad.speaking, false);
});

test("a cough (under 250 ms of voice) is discarded, not sent", () => {
  const { vad, at } = calibrated();
  let r = feed(vad, at, 150, 0.5);
  assert.equal(r.events[0]?.ev, "start");
  r = feed(vad, r.at, 1500, 0.02);
  assert.equal(r.events[0]?.ev, "discard");
});

test("talking on and on is cut at 30 s", () => {
  const { vad, at } = calibrated();
  const r = feed(vad, at, 30_150, 0.5);
  assert.deepEqual(
    r.events.map((e) => e.ev),
    ["start", "cap"],
  );
  assert.ok(r.events[1]!.at - r.events[0]!.at >= 29_800);
});

test("finish (Space) ends speech now; reset keeps the measured floor", () => {
  const { vad, at } = calibrated(0.05);
  const before = vad.thresholds().floor;
  assert.equal(vad.finish(at), null, "nothing to end");
  const r = feed(vad, at, 300, 0.5);
  assert.equal(r.events[0]?.ev, "start");
  assert.equal(vad.finish(r.at), "end");
  vad.reset(r.at + 10);
  assert.equal(vad.calibrating, false, "no second calibration");
  assert.ok(Math.abs(vad.thresholds().floor - before) < 0.02);
  vad.reset(r.at + 20, true);
  assert.equal(vad.calibrating, true);
});

test("a noisy room raises the bar: its hum never starts speech", () => {
  const { vad, at } = calibrated(0.1);
  const hum = feed(vad, at, 3000, () => 0.1 + Math.random() * 0.04);
  assert.deepEqual(hum.events, []);
  const talk = feed(vad, hum.at, 400, 0.7);
  assert.equal(talk.events[0]?.ev, "start");
});
