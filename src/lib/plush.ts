/* ================================================================== */
/*  Plush avatars: the felt creature every person and agent wears.     */
/*                                                                     */
/*  A face is still described by the same short seed the doodles used  */
/*  (Clerk `unsafeMetadata.doodle`, `agent_avatar_seed`, or a default  */
/*  derived from an email or id), so nothing new is stored. This file  */
/*  turns that seed into a character: body shape, colour, accessory    */
/*  and eye style, each drawn independently, so there are 6 x 9 x 4 x  */
/*  2 = 432 of them. The same seed gives the same character on every   */
/*  surface and after every deploy.                                    */
/*                                                                     */
/*  Pure: no React, no DOM, no WebGL. The shader that draws a          */
/*  character is `components/plush/shader.ts`; this file also holds    */
/*  the numbers that shader needs for each shape (where the eyes,      */
/*  headphones and sprout sit) and how to frame it in a square.        */
/* ================================================================== */

import { seededRandom } from "./doodle.ts";

/** Bump only if the mapping changes in a way that should re-roll everyone's character. */
export const PLUSH_VERSION = 1;

export const PLUSH_SHAPES = ["pebble", "cloud", "gumdrop", "pillow", "star", "bun"] as const;
export const PLUSH_ACCESSORIES = ["none", "glasses", "headphones", "sprout"] as const;
export const PLUSH_EYES = ["bead", "happy"] as const;

export type PlushShape = (typeof PLUSH_SHAPES)[number];
export type PlushAccessory = (typeof PLUSH_ACCESSORIES)[number];
export type PlushEyes = (typeof PLUSH_EYES)[number];

export interface PlushColour {
  name: string;
  /** linear-ish 0..1 components, exactly what the shader multiplies with */
  rgb: readonly [number, number, number];
}

/* Illustration colours, not UI tokens: a plush carries its own felt, so it reads as the same
   character on the light and dark themes. The first six are the approved prototype's; the last
   three sit in the same vivid family. */
export const PLUSH_COLOURS: readonly PlushColour[] = [
  { name: "tangerine", rgb: [0.97, 0.4, 0.22] },
  { name: "cobalt", rgb: [0.3, 0.47, 0.97] },
  { name: "marigold", rgb: [0.99, 0.71, 0.16] },
  { name: "rose", rgb: [0.96, 0.4, 0.6] },
  { name: "jade", rgb: [0.24, 0.74, 0.52] },
  { name: "violet", rgb: [0.6, 0.46, 0.97] },
  { name: "lagoon", rgb: [0.12, 0.7, 0.8] },
  { name: "lime", rgb: [0.6, 0.78, 0.2] },
  { name: "orchid", rgb: [0.86, 0.36, 0.84] },
];

/** The bead eyes and the SVG fallback's eyes. */
export const PLUSH_INK = "#0b0a0c";

const hex2 = (v: number) =>
  Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, "0");

/** `#rrggbb` for a colour, optionally mixed towards white (`lift` 0..1) or black (`lift` -1..0). */
export function plushHex(colour: PlushColour, lift = 0): string {
  return `#${colour.rgb.map((c) => hex2(lift >= 0 ? c + (1 - c) * lift : c * (1 + lift))).join("")}`;
}

export interface PlushSpec {
  seed: string;
  shape: PlushShape;
  /** index into PLUSH_SHAPES, the shader's `uShape` */
  shapeIndex: number;
  /** index into PLUSH_COLOURS */
  colourIndex: number;
  colour: PlushColour;
  accessory: PlushAccessory;
  /** index into PLUSH_ACCESSORIES, the shader's `uAcc` */
  accessoryIndex: number;
  eyes: PlushEyes;
  /** 0..1, offsets this character's breathing, blinking and sway from its neighbours' */
  phase: number;
  /** which way it tilts its head while listening */
  side: 1 | -1;
}

/* Weights. Half of all characters wear something; one in three smiles with its eyes. */
const ACCESSORY_ODDS: readonly [PlushAccessory, number][] = [
  ["none", 0.4],
  ["glasses", 0.2],
  ["headphones", 0.2],
  ["sprout", 0.2],
];
const HAPPY_EYES_ODDS = 1 / 3;

/**
 * The character a seed draws. Every trait is read from one seeded stream in a fixed order, so a
 * trait added later must be appended to the end of this function, never inserted before it.
 */
export function plushSpec(seed: string): PlushSpec {
  const key = seed || "someone";
  const rand = seededRandom(`plush:${PLUSH_VERSION}:${key}`);
  const shapeIndex = Math.floor(rand() * PLUSH_SHAPES.length) % PLUSH_SHAPES.length;
  const colourIndex = Math.floor(rand() * PLUSH_COLOURS.length) % PLUSH_COLOURS.length;
  let a = rand();
  let accessory: PlushAccessory = "none";
  for (const [name, odds] of ACCESSORY_ODDS) {
    if (a < odds) {
      accessory = name;
      break;
    }
    a -= odds;
  }
  const eyes: PlushEyes = rand() < HAPPY_EYES_ODDS ? "happy" : "bead";
  const phase = rand();
  const side = rand() < 0.5 ? 1 : -1;
  return {
    seed: key,
    shape: PLUSH_SHAPES[shapeIndex],
    shapeIndex,
    colourIndex,
    colour: PLUSH_COLOURS[colourIndex],
    accessory,
    accessoryIndex: PLUSH_ACCESSORIES.indexOf(accessory),
    eyes,
    phase,
    side,
  };
}

/* ---------------- how each shape wears its face ---------------- */

/* All in the shader's body space: x right, y up, the ground at y = -0.8, the body about 1.5 tall.
   `eyeY` is the prototype's eye height for the shape. The headphone numbers place the two cups
   (`x`, `y`) against the body's sides and the band's highest point (`top`) just clear of the head;
   the sprout's base sits a little inside the top of the head so the stem grows out of the felt.
   `body` is the bare silhouette as the camera sees it (the camera looks slightly down, so a point
   lands at screen y = y + 0.04 - 0.2 z), measured from the shader; tests/e2e checks it. */
export interface PlushFit {
  eyeY: number;
  /** the ear cups' centre (`x`, `y`), the band's highest point, and how square the band's arc is
      (2 is an ellipse; the boxy pillow needs a squarer arc to clear its corners) */
  phones: { x: number; y: number; top: number; square: number };
  sprout: { x: number; y: number };
  body: { left: number; right: number; top: number; bottom: number };
}

export const PLUSH_FIT: Record<PlushShape, PlushFit> = {
  pebble: { eyeY: 0.06, phones: { x: 0.99, y: -0.1, top: 0.8, square: 2 }, sprout: { x: 0, y: 0.575 }, body: { left: -0.92, right: 0.92, top: 0.78, bottom: -0.83 } },
  cloud: { eyeY: -0.06, phones: { x: 1.045, y: -0.28, top: 0.75, square: 2 }, sprout: { x: 0, y: 0.38 }, body: { left: -0.93, right: 0.93, top: 0.65, bottom: -0.8 } },
  gumdrop: { eyeY: -0.16, phones: { x: 0.97, y: -0.25, top: 0.79, square: 2 }, sprout: { x: 0, y: 0.56 }, body: { left: -0.87, right: 0.87, top: 0.76, bottom: -0.8 } },
  pillow: { eyeY: -0.04, phones: { x: 0.9, y: -0.06, top: 0.69, square: 3.2 }, sprout: { x: 0, y: 0.455 }, body: { left: -0.77, right: 0.77, top: 0.71, bottom: -0.83 } },
  star: { eyeY: -0.12, phones: { x: 0.96, y: 0.06, top: 0.835, square: 2 }, sprout: { x: 0, y: 0.605 }, body: { left: -0.83, right: 0.83, top: 0.8, bottom: -0.82 } },
  bun: { eyeY: -0.1, phones: { x: 0.98, y: -0.14, top: 0.565, square: 2 }, sprout: { x: 0, y: 0.335 }, body: { left: -0.85, right: 0.85, top: 0.67, bottom: -0.75 } },
};

/* How far above the stem's base the taller leaf's tip appears on screen (measured). */
const SPROUT_RISE = 0.775;

export interface PlushBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The silhouette of a shape with its accessory, in screen units. */
export function plushBounds(shape: PlushShape, accessory: PlushAccessory): PlushBounds {
  const fit = PLUSH_FIT[shape];
  const b: PlushBounds = { ...fit.body };
  if (accessory === "headphones") {
    // each cup, with its accent ring, reaches 0.105 past its centre; the band is a 0.044 tube
    b.left = Math.min(b.left, -fit.phones.x - 0.107);
    b.right = Math.max(b.right, fit.phones.x + 0.107);
    b.top = Math.max(b.top, fit.phones.top + 0.09);
  } else if (accessory === "sprout") {
    b.top = Math.max(b.top, fit.sprout.y + SPROUT_RISE);
  }
  return b;
}

/** A camera for the shader: the screen point at the middle of the box and the units across it. */
export interface PlushView {
  cx: number;
  cy: number;
  span: number;
}

/** How much of its box a still fills, edge to edge on its longer side. */
export const PLUSH_STILL_FILL = 0.86;

/** Frames a still: the character centred, filling `fill` of the square. */
export function plushStillView(spec: Pick<PlushSpec, "shape" | "accessory">, fill = PLUSH_STILL_FILL): PlushView {
  const b = plushBounds(spec.shape, spec.accessory);
  const span = Math.max(b.right - b.left, b.top - b.bottom) / fill;
  return { cx: (b.left + b.right) / 2, cy: (b.top + b.bottom) / 2, span };
}

/**
 * Frames a live character in a round or square frame: a little smaller than the still, with room
 * above for a hop and room below for its shadow.
 */
export function plushLiveView(spec: Pick<PlushSpec, "shape" | "accessory">): PlushView {
  const b = plushBounds(spec.shape, spec.accessory);
  const top = b.top + 0.24;
  const bottom = b.bottom - 0.1;
  const span = Math.max((b.right - b.left) / 0.84, (top - bottom) / 0.96);
  return { cx: (b.left + b.right) / 2, cy: (top + bottom) / 2, span };
}

/** The approved prototype's own camera, for a character standing on an open stage. */
export const PLUSH_STAGE_VIEW: PlushView = { cx: 0, cy: 0.12, span: 2.85 };

/* ---------------- still sizes ---------------- */

/* A still is rendered once per seed and size bucket and reused everywhere that seed appears. The
   small bucket is twice the largest small avatar (48 CSS px), so it stays sharp on a 2x screen. */
export const PLUSH_BUCKETS = [96, 192, 384] as const;
export type PlushBucket = (typeof PLUSH_BUCKETS)[number];

/** The bitmap size that serves a box `cssPx` wide on a screen with this pixel ratio (capped at 2). */
export function plushBucket(cssPx: number, dpr = 2): PlushBucket {
  const need = Math.max(1, cssPx) * Math.min(2, Math.max(1, dpr));
  for (const b of PLUSH_BUCKETS) if (need <= b * 1.05) return b;
  return PLUSH_BUCKETS[PLUSH_BUCKETS.length - 1];
}

/** The key a still is cached under. */
export function plushStillKey(seed: string, bucket: number): string {
  return `v${PLUSH_VERSION}|${seed || "someone"}|${bucket}`;
}
