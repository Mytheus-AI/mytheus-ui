// Run: npm test
// Agent orbs: the seed an agent already has (the doodle seed) always maps to the same glass
// creature, every trait stays inside what the renderer can draw, and every hue and shape is used.
import assert from "node:assert/strict";
import { test } from "node:test";

import { ORB_HUES, orbHue, orbSnapshotKey, orbTraits } from "../src/lib/agent-orb.ts";
import { defaultDoodleSeed, randomDoodleSeed } from "../src/lib/doodle.ts";

const SHAPES = ["ball", "splat", "cloud"];
const EYES = ["happy", "dots", "wink"];
const MOUTHS = ["smile", "open"];
const ACCESSORIES = ["none", "headphones", "glasses", "visor", "beanie"];
const SPARKS = ["none", "lines", "dot", "stars"];

const seeds = Array.from({ length: 600 }, (_, i) => defaultDoodleSeed(`agent:user-${i}`));

test("the same seed always gives the same creature", () => {
  for (const s of seeds.slice(0, 50)) assert.deepEqual(orbTraits(s), orbTraits(s));
  const r = randomDoodleSeed();
  assert.deepEqual(orbTraits(r), orbTraits(r));
});

test("existing agents keep a stable face (pinned examples)", () => {
  // If this fails, the mapping changed and every agent in production would get a new face.
  // Change these only together with ORB_VERSION.
  assert.deepEqual(orbTraits("ic5kget9wh"), { hue: 4, shape: "ball", eyes: "wink", mouth: "smile", accessory: "none", sparks: "lines" });
  assert.deepEqual(orbTraits("abcd2345"), { hue: 0, shape: "cloud", eyes: "wink", mouth: "smile", accessory: "none", sparks: "lines" });
  assert.deepEqual(orbTraits("agent-seed-juniper"), { hue: 5, shape: "ball", eyes: "happy", mouth: "open", accessory: "headphones", sparks: "dot" });
  assert.equal(defaultDoodleSeed("agent:u-samar"), "ic5kget9wh");
});

test("every trait is one the renderer can draw", () => {
  for (const s of seeds) {
    const t = orbTraits(s);
    assert.ok(Number.isInteger(t.hue) && t.hue >= 0 && t.hue < ORB_HUES.length, `hue ${t.hue}`);
    assert.ok(SHAPES.includes(t.shape));
    assert.ok(EYES.includes(t.eyes));
    assert.ok(MOUTHS.includes(t.mouth));
    assert.ok(ACCESSORIES.includes(t.accessory));
    assert.ok(SPARKS.includes(t.sparks));
  }
});

test("accessories only go on bodies they fit, and glasses never come with sparks", () => {
  for (const s of seeds) {
    const t = orbTraits(s);
    if (t.accessory === "headphones" || t.accessory === "glasses" || t.accessory === "visor") assert.equal(t.shape, "ball", s);
    if (t.accessory === "glasses") assert.equal(t.sparks, "none", s);
  }
});

test("every hue, shape, eye, mouth, accessory and spark shows up across agents", () => {
  const seen = { hue: new Set<number>(), shape: new Set<string>(), eyes: new Set<string>(), mouth: new Set<string>(), accessory: new Set<string>(), sparks: new Set<string>() };
  for (const s of seeds) {
    const t = orbTraits(s);
    seen.hue.add(t.hue);
    seen.shape.add(t.shape);
    seen.eyes.add(t.eyes);
    seen.mouth.add(t.mouth);
    seen.accessory.add(t.accessory);
    seen.sparks.add(t.sparks);
  }
  assert.equal(seen.hue.size, ORB_HUES.length);
  assert.equal(seen.shape.size, SHAPES.length);
  assert.equal(seen.eyes.size, EYES.length);
  assert.equal(seen.mouth.size, MOUTHS.length);
  assert.equal(seen.accessory.size, ACCESSORIES.length);
  assert.equal(seen.sparks.size, SPARKS.length);
});

test("different agents mostly look different", () => {
  const looks = new Set(seeds.map((s) => JSON.stringify(orbTraits(s))));
  assert.ok(looks.size > 60, `only ${looks.size} distinct creatures`);
});

test("orbHue matches the trait's hue, and snapshot keys separate seed, size and theme", () => {
  const s = seeds[7];
  assert.deepEqual(orbHue(s), ORB_HUES[orbTraits(s).hue]);
  const keys = new Set([
    orbSnapshotKey(s, 30, "light"),
    orbSnapshotKey(s, 30, "dark"),
    orbSnapshotKey(s, 44, "light"),
    orbSnapshotKey(seeds[8], 30, "light"),
    orbSnapshotKey(s, 30, "light", 2),
  ]);
  assert.equal(keys.size, 5);
});

test("an empty seed still draws a creature", () => {
  const t = orbTraits("");
  assert.ok(SHAPES.includes(t.shape));
});
