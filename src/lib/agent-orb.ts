/* ================================================================== */
/*  Agent orbs: the glass creature every personal agent wears.         */
/*                                                                     */
/*  An agent's face is still described by the same short seed the     */
/*  doodle used (`agent_avatar_seed`, or the default derived from the  */
/*  owner's id), so nothing new is stored. This file turns that seed   */
/*  into the creature's traits: hue, body shape, eyes, mouth,          */
/*  accessory and sparks. The same seed always gives the same          */
/*  creature, on every surface and after every deploy.                 */
/*                                                                     */
/*  Pure: no React, no DOM, no three.js. The renderer lives in         */
/*  `components/agent/orb-scene.ts` and is loaded lazily.              */
/* ================================================================== */

import { seededRandom } from "./doodle.ts";

/** Bump only if the mapping changes in a way that should re-roll every agent's creature. */
export const ORB_VERSION = 1;

export type OrbShape = "ball" | "splat" | "cloud";
export type OrbEyes = "happy" | "dots" | "wink";
export type OrbMouth = "smile" | "open";
export type OrbAccessory = "none" | "headphones" | "glasses" | "visor" | "beanie";
export type OrbSparks = "none" | "lines" | "dot" | "stars";
export type OrbState = "idle" | "listening" | "speaking";
export type OrbTheme = "light" | "dark";

export interface OrbHue {
  /** the liquid's darkest layer and the core behind the face */
  deep: string;
  /** the body colour */
  mid: string;
  /** the rim light */
  rim: string;
  /** the light pooled at the bottom */
  lite: string;
}

/* Illustration colours, not UI tokens (like the doodle palette): an orb carries its own light, so
   it reads as the same creature on the light and dark themes. */
export const ORB_HUES: readonly OrbHue[] = [
  { deep: "#140f4a", mid: "#5546e8", rim: "#b9b0ff", lite: "#8fb4ff" }, // indigo
  { deep: "#4a1a05", mid: "#f07a2c", rim: "#ffd09a", lite: "#ffb060" }, // amber
  { deep: "#04302a", mid: "#12b386", rim: "#90ffdc", lite: "#7dffb0" }, // mint
  { deep: "#34105a", mid: "#b45ae6", rim: "#ffb4f2", lite: "#f09aff" }, // orchid
  { deep: "#081c66", mid: "#2c6cf0", rim: "#a4dcff", lite: "#62b4ff" }, // azure
  { deep: "#1c0f56", mid: "#6a3fe6", rim: "#d0baff", lite: "#b48cff" }, // violet
];

export interface OrbTraits {
  /** index into ORB_HUES */
  hue: number;
  shape: OrbShape;
  eyes: OrbEyes;
  mouth: OrbMouth;
  accessory: OrbAccessory;
  sparks: OrbSparks;
}

/* Which accessories fit which body. The headphone cups, the glasses' orbit and the visor band are
   sized for the round body; on the wider cloud and splat they would sink into the glass. */
const ACCESSORIES: Record<OrbShape, readonly OrbAccessory[]> = {
  ball: ["headphones", "glasses", "visor", "none"],
  cloud: ["beanie", "none", "none"],
  splat: ["none", "none", "beanie"],
};

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

/**
 * The creature an agent's seed draws. Every trait is read from one seeded stream in a fixed order,
 * so adding a trait later must append to the end of this function, never insert before it.
 */
export function orbTraits(seed: string): OrbTraits {
  const rand = seededRandom(`orb:${seed || "someone"}`);
  const hue = Math.floor(rand() * ORB_HUES.length) % ORB_HUES.length;
  const r = rand();
  const shape: OrbShape = r < 0.5 ? "ball" : r < 0.8 ? "cloud" : "splat";
  const eyes = pick<OrbEyes>(rand, ["happy", "dots", "dots", "wink"]);
  const mouth = pick<OrbMouth>(rand, ["smile", "smile", "open"]);
  const accessory = pick(rand, ACCESSORIES[shape]);
  // The glasses already carry an orbit ring; sparks beside it would crowd the face.
  const sparks: OrbSparks = accessory === "glasses" ? (rand(), "none") : pick<OrbSparks>(rand, ["none", "lines", "dot", "stars"]);
  return { hue, shape, eyes, mouth, accessory, sparks };
}

/** The colours of an agent's hue, for the soft circle shown while the orb renders. */
export function orbHue(seed: string): OrbHue {
  return ORB_HUES[orbTraits(seed).hue];
}

/** The key a still snapshot is cached under. */
export function orbSnapshotKey(seed: string, sizePx: number, theme: OrbTheme, dpr = 1): string {
  return `v${ORB_VERSION}|${seed}|${Math.round(sizePx)}|${theme}|${dpr}`;
}

