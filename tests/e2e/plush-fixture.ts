import { defaultDoodleSeed } from "../../src/lib/doodle";
import { plushSpec, type PlushAccessory, type PlushShape } from "../../src/lib/plush";

/* Seeds for the plush harness and its specs. Kept out of PlushHarness.tsx: a component-test file
   may only export components. */

export const PLUSH_SEEDS = Array.from({ length: 24 }, (_, i) => defaultDoodleSeed(`person${i}@example.com`));

/** A seed that draws this shape with this accessory (bead eyes), found by search. */
export function comboSeed(shape: PlushShape, accessory: PlushAccessory, eyes: "bead" | "happy" = "bead"): string {
  for (let i = 0; i < 20000; i++) {
    const seed = defaultDoodleSeed(`combo-${i}`);
    const s = plushSpec(seed);
    if (s.shape === shape && s.accessory === accessory && s.eyes === eyes) return seed;
  }
  throw new Error(`no seed for ${shape} ${accessory}`);
}
