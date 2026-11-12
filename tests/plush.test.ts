// node --experimental-strip-types --test tests/plush.test.ts
// Plush avatars: the seed a person or agent already has always maps to the same felt character,
// the four traits are independent and well spread, and every shape and accessory frames to the
// same share of its box.
import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultDoodleSeed, randomDoodleSeed } from "../src/lib/doodle.ts";
import {
  PLUSH_ACCESSORIES,
  PLUSH_BUCKETS,
  PLUSH_COLOURS,
  PLUSH_EYES,
  PLUSH_FIT,
  PLUSH_SHAPES,
  PLUSH_STILL_FILL,
  plushBounds,
  plushBucket,
  plushHex,
  plushLiveView,
  plushSpec,
  plushStillKey,
  plushStillView,
} from "../src/lib/plush.ts";

const seeds = Array.from({ length: 3000 }, (_, i) => defaultDoodleSeed(`agent:user-${i}`));
const specs = seeds.map(plushSpec);

test("the same seed always draws the same character", () => {
  for (const s of seeds.slice(0, 200)) assert.deepEqual(plushSpec(s), plushSpec(s));
  const r = randomDoodleSeed();
  assert.deepEqual(plushSpec(r), plushSpec(r));
});

test("the mapping is pinned: a deploy must not re-roll anyone's face", () => {
  const pick = (seed: string) => {
    const s = plushSpec(seed);
    return `${s.shape}/${s.colour.name}/${s.accessory}/${s.eyes}`;
  };
  assert.equal(defaultDoodleSeed("agent:u-samar"), "ic5kget9wh");
  assert.deepEqual(["ic5kget9wh", "abcd2345", "maya", "k3mzq7wpta"].map(pick), PINNED);
});
const PINNED = ["pillow/orchid/sprout/happy", "bun/tangerine/none/bead", "pebble/lagoon/sprout/happy", "gumdrop/tangerine/glasses/happy"];

test("an empty seed still draws someone", () => {
  assert.deepEqual(plushSpec(""), plushSpec("someone"));
});

test("six shapes, nine colours, four accessories, two eye styles; no drop", () => {
  assert.deepEqual([...PLUSH_SHAPES], ["pebble", "cloud", "gumdrop", "pillow", "star", "bun"]);
  assert.equal(PLUSH_COLOURS.length, 9);
  assert.deepEqual([...PLUSH_ACCESSORIES], ["none", "glasses", "headphones", "sprout"]);
  assert.deepEqual([...PLUSH_EYES], ["bead", "happy"]);
  for (const s of specs.slice(0, 300)) {
    assert.equal(PLUSH_SHAPES[s.shapeIndex], s.shape);
    assert.equal(PLUSH_ACCESSORIES[s.accessoryIndex], s.accessory);
    assert.equal(PLUSH_COLOURS[s.colourIndex], s.colour);
    assert.ok(s.phase >= 0 && s.phase < 1);
    assert.ok(s.side === 1 || s.side === -1);
  }
});

const share = <T,>(list: T[], is: (x: T) => boolean) => list.filter(is).length / list.length;

test("traits are well spread", () => {
  for (const shape of PLUSH_SHAPES) {
    const p = share(specs, (s) => s.shape === shape);
    assert.ok(Math.abs(p - 1 / 6) < 0.03, `${shape}: ${p}`);
  }
  for (let c = 0; c < PLUSH_COLOURS.length; c++) {
    const p = share(specs, (s) => s.colourIndex === c);
    assert.ok(Math.abs(p - 1 / 9) < 0.025, `${PLUSH_COLOURS[c].name}: ${p}`);
  }
  assert.ok(Math.abs(share(specs, (s) => s.accessory === "none") - 0.4) < 0.04);
  for (const a of ["glasses", "headphones", "sprout"] as const) assert.ok(Math.abs(share(specs, (s) => s.accessory === a) - 0.2) < 0.03, a);
  assert.ok(Math.abs(share(specs, (s) => s.eyes === "happy") - 1 / 3) < 0.04);
  assert.ok(Math.abs(share(specs, (s) => s.side === 1) - 0.5) < 0.04);
});

test("traits are independent: every pairing turns up about as often as chance says", () => {
  // shape x colour: 54 cells, about 55 expected in each
  for (const shape of PLUSH_SHAPES) {
    const of = specs.filter((s) => s.shape === shape);
    for (let c = 0; c < PLUSH_COLOURS.length; c++) {
      const p = share(of, (s) => s.colourIndex === c);
      assert.ok(p > 0.05 && p < 0.18, `${shape} x ${PLUSH_COLOURS[c].name}: ${p}`);
    }
    for (const a of PLUSH_ACCESSORIES) {
      const p = share(of, (s) => s.accessory === a);
      const want = a === "none" ? 0.4 : 0.2;
      assert.ok(Math.abs(p - want) < 0.08, `${shape} x ${a}: ${p}`);
    }
    assert.ok(Math.abs(share(of, (s) => s.eyes === "happy") - 1 / 3) < 0.08, `${shape} x eyes`);
  }
  for (const a of PLUSH_ACCESSORIES) {
    const of = specs.filter((s) => s.accessory === a);
    assert.ok(Math.abs(share(of, (s) => s.eyes === "happy") - 1 / 3) < 0.08, `${a} x eyes`);
  }
});

test("well over a hundred different characters turn up", () => {
  const seen = new Set(specs.map((s) => `${s.shapeIndex}|${s.colourIndex}|${s.accessoryIndex}|${s.eyes}`));
  assert.ok(seen.size > 380, `${seen.size} of 432`);
});

test("a small crowd does not look stamped", () => {
  // 24 people: at least five shapes, six colours and three accessories among them
  const crowd = Array.from({ length: 24 }, (_, i) => plushSpec(defaultDoodleSeed(`person${i}@example.com`)));
  assert.ok(new Set(crowd.map((s) => s.shape)).size >= 5);
  assert.ok(new Set(crowd.map((s) => s.colourIndex)).size >= 6);
  assert.ok(new Set(crowd.map((s) => s.accessory)).size >= 3);
});

test("colours are vivid and print as hex", () => {
  for (const c of PLUSH_COLOURS) {
    assert.match(plushHex(c), /^#[0-9a-f]{6}$/);
    const max = Math.max(...c.rgb);
    const min = Math.min(...c.rgb);
    assert.ok(max >= 0.74 && max - min >= 0.5, `${c.name} is not vivid`);
  }
  assert.equal(plushHex(PLUSH_COLOURS[0]), "#f76638");
  assert.equal(plushHex(PLUSH_COLOURS[0], 1), "#ffffff");
  assert.equal(plushHex(PLUSH_COLOURS[0], -1), "#000000");
  assert.equal(new Set(PLUSH_COLOURS.map((c) => plushHex(c))).size, PLUSH_COLOURS.length);
});

test("every shape has a fit, and its accessories sit on it", () => {
  for (const shape of PLUSH_SHAPES) {
    const fit = PLUSH_FIT[shape];
    // eyes inside the body, above the ground
    assert.ok(fit.eyeY > fit.body.bottom + 0.4 && fit.eyeY < fit.body.top - 0.3, `${shape} eyes`);
    // the cups sit against the sides (a cushion is 0.14 deep) and the band clears the cups
    assert.ok(fit.phones.x > fit.body.right - 0.05 && fit.phones.x < fit.body.right + 0.2, `${shape} cups`);
    assert.ok(fit.phones.top > fit.phones.y + 0.5, `${shape} band`);
    // the stem starts a little inside the top of the head
    assert.ok(fit.sprout.y < fit.body.top && fit.sprout.y > fit.body.top - 0.4, `${shape} sprout`);
  }
});

test("a still fills the same share of its box whatever it wears", () => {
  for (const shape of PLUSH_SHAPES) {
    for (const accessory of PLUSH_ACCESSORIES) {
      const b = plushBounds(shape, accessory);
      const v = plushStillView({ shape, accessory });
      const w = b.right - b.left;
      const h = b.top - b.bottom;
      assert.ok(Math.abs(Math.max(w, h) / v.span - PLUSH_STILL_FILL) < 1e-9);
      // centred, and inside the box on both axes
      assert.ok(Math.abs(v.cx - (b.left + b.right) / 2) < 1e-9 && Math.abs(v.cy - (b.top + b.bottom) / 2) < 1e-9);
      assert.ok(w <= v.span && h <= v.span);
      // an accessory only ever makes the silhouette bigger
      const bare = plushBounds(shape, "none");
      assert.ok(b.top >= bare.top && b.right >= bare.right && b.left <= bare.left);
    }
  }
});

test("a live frame leaves room for a hop and the shadow", () => {
  for (const shape of PLUSH_SHAPES) {
    for (const accessory of PLUSH_ACCESSORIES) {
      const b = plushBounds(shape, accessory);
      const v = plushLiveView({ shape, accessory });
      assert.ok(v.cy + v.span / 2 >= b.top + 0.24, `${shape} ${accessory} headroom`);
      assert.ok(v.cy - v.span / 2 <= b.bottom - 0.1, `${shape} ${accessory} floor`);
      assert.ok(v.span > plushStillView({ shape, accessory }).span);
    }
  }
});

test("size buckets: twice the largest small avatar, and never upscaled on a 2x screen", () => {
  assert.deepEqual([...PLUSH_BUCKETS], [96, 192, 384]);
  for (const css of [22, 24, 28, 36, 44, 48]) assert.equal(plushBucket(css, 2), 96);
  assert.equal(plushBucket(48, 1), 96);
  assert.equal(plushBucket(64, 2), 192);
  assert.equal(plushBucket(96, 2), 192);
  assert.equal(plushBucket(110, 2), 384);
  assert.equal(plushBucket(96, 1), 96);
  assert.equal(plushBucket(400, 3), 384);
  assert.equal(plushBucket(0), 96);
  assert.notEqual(plushStillKey("abcd2345", 96), plushStillKey("abcd2345", 192));
  assert.equal(plushStillKey("", 96), plushStillKey("someone", 96));
});
