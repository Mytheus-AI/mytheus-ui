// node --experimental-strip-types --test tests/plush-motion.test.ts
// The live plush's animation system (the approved prototype's state machine): wink timing, the
// celebration, sleep and waking, the eyes following the pointer, the caret, the speaker and the
// thinking spark, and the timing guard. Driven with a fake clock at 60 frames a second.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CELEBRATE_MS,
  MAX_DT,
  PLUSH_NEUTRAL_POSE,
  POINTER_FOLLOW_MS,
  SMILE_SECONDS,
  TYPING_MS,
  WINK_SECONDS,
  createPlushMotion,
  simulatedLevel,
  type PlushMotion,
  type PlushMotionInput,
  type PlushPose,
} from "../src/lib/plush-motion.ts";

/** A repeatable 0..1 stream. */
function lcg(seed = 7): () => number {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

const FRAME = 1000 / 60;
const IDLE: PlushMotionInput = { state: "idle" };

/** Steps from `from` to `to` (ms) and returns the last pose, calling `each` on every frame. */
function run(m: PlushMotion, from: number, to: number, input: PlushMotionInput | ((now: number) => PlushMotionInput) = IDLE, each?: (pose: PlushPose, now: number) => void): PlushPose {
  let pose = PLUSH_NEUTRAL_POSE;
  for (let now = from; now <= to + 1e-6; now += FRAME) {
    pose = m.step(now, typeof input === "function" ? input(now) : input);
    each?.(pose, now);
  }
  return pose;
}
const make = (o: Parameters<typeof createPlushMotion>[0] = {}) => createPlushMotion({ random: lcg(), now: 0, smileChance: 0, ...o });

test("a still's pose is neutral: standing, eyes open, looking straight ahead", () => {
  assert.deepEqual(PLUSH_NEUTRAL_POSE, { hop: 0, sq: 0, tilt: 0, blinkL: 1, blinkR: 1, wink: 0, eye: 1, think: 0, listen: 0, speak: 0, level: 0, mouth: 0, look: [0, 0] });
});

test("a click winks the left eye for about 0.55 s and squashes", () => {
  const m = make();
  run(m, 0, 500);
  m.click(500);
  const first = m.step(500 + FRAME, IDLE);
  assert.equal(first.wink, 1);
  let winkFrames = 0;
  let lowest = 0;
  run(m, 500 + 2 * FRAME, 1700, IDLE, (p) => {
    if (p.wink === 1) winkFrames++;
    lowest = Math.min(lowest, p.sq);
  });
  const winkSeconds = ((winkFrames + 1) * FRAME) / 1000;
  assert.ok(Math.abs(winkSeconds - WINK_SECONDS) < 0.05, `winked for ${winkSeconds}s`);
  assert.ok(lowest < -0.03, `squashed to ${lowest}`);
  assert.equal(m.step(1700 + FRAME, IDLE).wink, 0);
});

test("a double click is a full hop that lands again", () => {
  const m = make();
  run(m, 0, 300);
  m.doubleClick(300);
  let peak = 0;
  const end = run(m, 300 + FRAME, 1200, IDLE, (p) => (peak = Math.max(peak, p.hop)));
  assert.ok(peak > 0.95, `peak ${peak}`);
  assert.ok(Math.abs(end.hop) < 1e-9);
});

test("celebrate: both eyes smile for 1.3 s and it hops", () => {
  const m = make();
  run(m, 0, 400);
  m.celebrate(400);
  let both = 0;
  let peak = 0;
  run(m, 400 + FRAME, 400 + CELEBRATE_MS + 400, IDLE, (p) => {
    if (p.wink === 2) both++;
    peak = Math.max(peak, p.hop);
  });
  assert.ok(Math.abs((both * FRAME) / 1000 - CELEBRATE_MS / 1000) < 0.05);
  assert.ok(peak > 0.7 && peak <= 0.8 + 1e-9);
});

test('state "happy" celebrates once on arrival, then rests', () => {
  const m = make();
  run(m, 0, 500);
  assert.equal(m.step(500 + FRAME, { state: "happy" }).wink, 2);
  const later = run(m, 500 + 2 * FRAME, 500 + CELEBRATE_MS + 500, { state: "happy" });
  assert.equal(later.wink, 0);
});

test("Enter in the followed field celebrates; other keys bob", () => {
  const m = make();
  run(m, 0, 300);
  m.key(300);
  let lowest = 0;
  run(m, 300 + FRAME, 700, IDLE, (p) => {
    lowest = Math.min(lowest, p.sq);
    assert.notEqual(p.wink, 2);
  });
  assert.ok(lowest < -0.004, `bobbed to ${lowest}`);
  m.key(700, true);
  assert.equal(m.step(700 + FRAME, IDLE).wink, 2);
});

test("it gets drowsy, falls asleep, and startles awake on any activity", () => {
  const m = make({ drowsyAfter: 9, asleepAfter: 15 });
  let pose = run(m, 0, 8000);
  assert.equal(m.mood(8000), "awake");
  pose = run(m, 8000, 12000);
  assert.equal(m.mood(12000), "drowsy");
  assert.ok(pose.blinkL <= 0.5 && pose.blinkR <= 0.5, "half-closed eyes");
  assert.ok(pose.look[1] < -0.2, "looking down");
  pose = run(m, 12000, 20000);
  assert.equal(m.mood(20000), "asleep");
  assert.equal(pose.blinkL, 0);
  assert.equal(pose.blinkR, 0);

  // asleep it neither fidgets nor smiles
  run(m, 20000, 40000, IDLE, (p) => {
    assert.equal(p.hop, 0);
    assert.equal(p.wink, 0);
    assert.equal(p.blinkL, 0);
  });

  const before = m.step(40000, IDLE).sq;
  m.act(40000);
  assert.equal(m.mood(40000), "awake");
  let widest = 0;
  let tallest = -1;
  let opened = false;
  run(m, 40000 + FRAME, 41500, IDLE, (p) => {
    widest = Math.max(widest, p.eye);
    tallest = Math.max(tallest, p.sq - before);
    if (p.blinkL > 0.9) opened = true;
  });
  assert.ok(opened, "eyes open again");
  assert.ok(widest > 1.15, `wide eyes: ${widest}`);
  assert.ok(tallest > 0.04, `startle bounce: ${tallest}`);
});

test("no startle when it was not drowsy", () => {
  const m = make({ drowsyAfter: 9, asleepAfter: 15 });
  run(m, 0, 3000);
  m.act(3000);
  let widest = 0;
  run(m, 3000 + FRAME, 4000, IDLE, (p) => (widest = Math.max(widest, p.eye)));
  assert.ok(widest < 1.05);
});

test("the sleep timings are options, and an agent at work does not nod off", () => {
  const app = make({ drowsyAfter: 45, asleepAfter: 90 });
  run(app, 0, 40000);
  assert.equal(app.mood(40000), "awake");
  run(app, 40000, 50000);
  assert.equal(app.mood(50000), "drowsy");
  run(app, 50000, 95000);
  assert.equal(app.mood(95000), "asleep");

  const proto = make();
  run(proto, 0, 31000);
  assert.equal(proto.mood(31000), "drowsy");
  run(proto, 31000, 51000);
  assert.equal(proto.mood(51000), "asleep");

  for (const state of ["listening", "speaking", "thinking"] as const) {
    const m = make({ drowsyAfter: 2, asleepAfter: 4 });
    const pose = run(m, 0, 12000, { state });
    assert.equal(m.mood(12000), "awake", state);
    assert.ok(pose.look[1] > -0.34 || state === "listening", `${state} is not looking at the floor`);
  }
});

test("the eyes follow the pointer while it moves, then return to idle gaze", () => {
  const m = make();
  const at: PlushMotionInput = { state: "idle", pointer: [0.9, -0.6], pointerAt: 1000 };
  const pose = run(m, 0, 1000 + POINTER_FOLLOW_MS - 100, at);
  assert.ok(Math.abs(pose.look[0] - 0.9) < 0.02 && Math.abs(pose.look[1] + 0.6) < 0.02, `look ${pose.look}`);
  // the pointer has not moved for 2.5 s: the gaze leaves it
  let left = false;
  run(m, 1000 + POINTER_FOLLOW_MS, 1000 + POINTER_FOLLOW_MS + 6000, at, (p) => {
    if (Math.abs(p.look[0] - 0.9) > 0.3) left = true;
  });
  assert.ok(left);
});

test("look targets are clamped", () => {
  const m = make();
  const pose = run(m, 0, 1500, { state: "idle", pointer: [5, -9], pointerAt: 1500 });
  assert.ok(pose.look[0] <= 1 + 1e-9 && pose.look[1] >= -1 - 1e-9);
});

test("typing: the eyes go to the caret, quickly, and beat the pointer", () => {
  const m = make();
  run(m, 0, 500, { state: "idle", pointer: [-0.8, 0.5], pointerAt: 500 });
  m.key(500);
  const typing: PlushMotionInput = { state: "idle", pointer: [-0.8, 0.5], pointerAt: 500, caret: [0.6, -0.7] };
  const pose = run(m, 500 + FRAME, 500 + 400, typing);
  assert.ok(Math.abs(pose.look[0] - 0.6) < 0.05 && Math.abs(pose.look[1] + 0.7) < 0.05, `look ${pose.look}`);
  // 1.2 s after the last key it is the pointer's turn again (it "moved" just now)
  const after = run(m, 500 + TYPING_MS + FRAME, 500 + TYPING_MS + 800, { ...typing, pointerAt: 500 + TYPING_MS });
  assert.ok(Math.abs(after.look[0] + 0.8) < 0.05, `look ${after.look}`);
});

test("thinking: the spark fades in at about 4 a second and the eyes ride its orbit", () => {
  const phase = 2.4;
  const m = make({ phase });
  run(m, 0, 500);
  const early = run(m, 500 + FRAME, 750, { state: "thinking" });
  assert.ok(early.think > 0.55 && early.think < 0.75, `think after 0.25 s: ${early.think}`);
  const pose = run(m, 750 + FRAME, 4000, { state: "thinking" }, (p, now) => {
    if (now < 2000) return;
    // the shader's orbit angle is uTime*2.6 + uPhase*1.7; the eyes chase the same angle
    const th = (now / 1000) * 2.6 + phase * 1.7;
    const want: [number, number] = [Math.max(-1, Math.min(1, Math.cos(th) * 1.05)), 0.45 + Math.sin(th) * 0.55];
    assert.ok(Math.hypot(p.look[0] - want[0], p.look[1] - want[1]) < 0.45, `eyes ${p.look} vs spark ${want}`);
    assert.ok(Math.abs(m.time - now / 1000) < 1e-9);
  });
  assert.ok(pose.think > 0.99);
  assert.ok(pose.blinkL <= 0.905 && pose.blinkR <= 0.905, "lids narrow by a tenth");
  const out = run(m, 4000 + FRAME, 6000, IDLE);
  assert.ok(out.think < 0.01);
});

test("listening: ripples in, eyes on the speaker, wider eyes, a lean and nods", () => {
  const m = make({ side: 1 });
  run(m, 0, 300);
  let nods = 0;
  let dipping = false;
  const speaker: PlushMotionInput = { state: "listening", speaker: [0.8, 0.3], level: 0.5 };
  const pose = run(m, 300 + FRAME, 12000, speaker, (p) => {
    // a nod dips the eyes well below the speaker
    const dip = p.look[1] < 0.3 - 0.25;
    if (dip && !dipping) nods++;
    dipping = dip;
    assert.equal(p.speak < 0.05, true);
    assert.equal(p.mouth, 0);
  });
  assert.ok(pose.listen > 0.99);
  assert.ok(nods >= 3 && nods <= 9, `${nods} nods in 12 s`);
  assert.ok(Math.abs(pose.look[0] - 0.8) < 0.1);
  assert.ok(pose.eye > 1.1, `eye ${pose.eye}`);
  assert.ok(pose.tilt < -0.04, `leans toward the speaker: ${pose.tilt}`);
  // with no speaker it looks at the viewer
  const m2 = make();
  const straight = run(m2, 0, 3000, { state: "listening" });
  assert.ok(Math.abs(straight.look[0]) < 0.1);
});

test("speaking: a mouth that follows the level, and a bounce on voice peaks", () => {
  const m = make();
  run(m, 0, 300);
  let loud = run(m, 300 + FRAME, 1200, { state: "speaking", level: 0.9 });
  assert.ok(loud.speak > 0.95);
  assert.ok(loud.mouth > 0.95, `open: ${loud.mouth}`);
  const quiet = run(m, 1200 + FRAME, 1700, { state: "speaking", level: 0 });
  assert.ok(quiet.mouth < 0.02, `closed: ${quiet.mouth}`);
  // a peak after quiet kicks the squash spring upward
  let tallest = -1;
  loud = run(m, 1700 + FRAME, 2000, { state: "speaking", level: 0.9 }, (p) => (tallest = Math.max(tallest, p.sq)));
  assert.ok(tallest > 0.035, `bounce ${tallest}`);
  // the mouth leaves with the state
  const done = run(m, 2000 + FRAME, 3200, IDLE);
  assert.equal(done.mouth < 0.01, true);
  assert.ok(done.speak < 0.02);
});

test("the simulated voice stays in 0..1, has syllables and pauses", () => {
  let max = 0;
  let quiet = 0;
  const n = 6000;
  for (let k = 0; k < n; k++) {
    const v = simulatedLevel(k / 100);
    assert.ok(v >= 0 && v <= 1);
    max = Math.max(max, v);
    if (v < 0.1) quiet++;
  }
  assert.ok(max > 0.9);
  assert.ok(quiet / n > 0.15 && quiet / n < 0.6);
});

test("hovering perks it up: taller, with bigger eyes", () => {
  const rest = run(make(), 0, 2000);
  const perk = run(make(), 0, 2000, { state: "idle", hover: true });
  assert.ok(perk.sq - rest.sq > 0.025);
  assert.ok(perk.eye > 1.08 && rest.eye < 1.02);
});

test("idle is alive: it blinks (some double, some slow), shifts its gaze and fidgets", () => {
  const m = createPlushMotion({ random: lcg(11), now: 0, smileChance: 1, drowsyAfter: 1e6, asleepAfter: 1e6 });
  let blinks = 0;
  let closed = false;
  let hops = 0;
  let hopping = false;
  let smiles = 0;
  let smiling = false;
  let smileFrames = 0;
  const looks = new Set<string>();
  const end = 120000;
  run(m, 0, end, IDLE, (p) => {
    const shut = p.blinkL < 0.3;
    if (shut && !closed) blinks++;
    closed = shut;
    const up = p.hop > 0.05;
    if (up && !hopping) hops++;
    hopping = up;
    const smile = p.wink === 2;
    if (smile && !smiling) smiles++;
    if (smile) smileFrames++;
    smiling = smile;
    looks.add(`${Math.round(p.look[0] * 3)},${Math.round(p.look[1] * 3)}`);
    assert.ok(Number.isFinite(p.sq) && Math.abs(p.sq) < 0.2 && Math.abs(p.tilt) < 0.25);
  });
  assert.ok(blinks >= 20 && blinks <= 90, `${blinks} blinks in two minutes`);
  assert.ok(hops >= 2, `${hops} fidget hops`);
  assert.ok(smiles >= 6 && smiles <= 18, `${smiles} smiles`);
  assert.ok(Math.abs((smileFrames * FRAME) / 1000 / smiles - SMILE_SECONDS) < 0.06);
  assert.ok(looks.size >= 10, `${looks.size} gaze spots`);
});

test("timing guard: a long stall advances the simulation by at most 50 ms", () => {
  assert.equal(MAX_DT, 0.05);
  const a = make();
  const b = make();
  run(a, 0, 1000);
  run(b, 0, 1000);
  a.click(1000);
  b.click(1000);
  // a: the tab stalls for ten seconds; b: one 50 ms frame. The spring and the wink agree.
  const pa = { ...a.step(11000, IDLE) };
  const pb = { ...b.step(1050, IDLE) };
  assert.equal(pa.wink, 1);
  assert.ok(Math.abs(pa.sq - pb.sq) < 0.01, `${pa.sq} vs ${pb.sq}`);
  assert.ok(Math.abs(pa.sq) < 0.2);
  // a clock that runs backwards does not run the simulation backwards
  const pc = a.step(10000, IDLE);
  assert.ok(Number.isFinite(pc.sq) && pc.wink === 1);
});
