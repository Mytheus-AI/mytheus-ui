/* ================================================================== */
/*  Doodle avatars.                                                    */
/*                                                                     */
/*  A doodle is fully described by a short seed string. The same seed  */
/*  always draws the same face, on the server and in the browser, so   */
/*  the only thing that ever needs storing is the seed (Clerk          */
/*  `unsafeMetadata.doodle`) plus, for everyone else who reads the     */
/*  user's picture, the rendered PNG that Clerk mirrors into           */
/*  `users.avatar_url` through the `user.updated` webhook.             */
/*                                                                     */
/*  Someone with no stored seed gets a doodle seeded from their id or  */
/*  name, so every person in the product has a face, never initials.   */
/*                                                                     */
/*  Pure functions only: no React, no DOM, no randomness that is not   */
/*  derived from the seed (except `randomDoodleSeed`).                 */
/* ================================================================== */

/** Bump only if the drawing changes in a way that should re-roll stored seeds. */
export const DOODLE_VERSION = 1;

/* ---------------- seeded randomness ---------------- */

/** FNV-1a, 32 bit. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: tiny, fast, good enough for drawing faces. */
export function seededRandom(seed: string): () => number {
  let a = hashString(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** A fresh, URL-safe seed for the shuffle button. */
export function randomDoodleSeed(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * The doodle someone has before they choose one: derived from a key every surface can see for
 * that person (their email), so their own sidebar and a teammate's view of their profile draw
 * the same face. Also what an existing account is given the first time it signs in.
 */
export function defaultDoodleSeed(key: string): string {
  const k = key.trim().toLowerCase() || "someone";
  let out = "";
  for (let i = 0; out.length < 10; i++) {
    const h = hashString(`${i}:${k}`);
    out += ALPHABET[h % ALPHABET.length] + ALPHABET[(h >>> 8) % ALPHABET.length];
  }
  return out.slice(0, 10);
}

/**
 * Clerk hands back an `imageUrl` even for an account with no picture: a generic placeholder whose
 * URL carries a base64 payload with `"type":"default"`. A doodle beats it, so treat it as absent.
 */
export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return true;
  const m = url.match(/img\.clerk\.com\/([A-Za-z0-9_-]+)/);
  if (!m) return false;
  try {
    const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("utf8");
    return /"type"\s*:\s*"default"/.test(json);
  } catch {
    return false;
  }
}

/** Seeds are short and plain. Anything else (a hand-edited metadata value) is ignored. */
export function isDoodleSeed(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]{4,32}$/.test(value);
}

/* ---------------- the palette ---------------- */
/* Illustration colours, not UI tokens: a doodle carries its own tile, so it reads the same on the
   light and dark themes, the way a photo would. */

export const INK = "#2a2620";
const PAPER = "#fffaf0";

const TILES = ["#f5d9c8", "#f2e3b3", "#cfe3d0", "#cddff0", "#e3d5f0", "#f4cfd6", "#d6ebe4", "#efe4d2", "#f6c9b4", "#dfe6c4"];
const SKIN = [PAPER, "#fbe7d3", "#f3d2b3", "#e2b48c", "#c48d63", "#9a6a47", "#6f4a32"];
const HAIR = [INK, INK, "#5b3a24", "#8a5a33", "#c99a2e", "#bd5d3a", "#6d4a7a", "#3d5a80"];
const SHIRT = ["#d97757", INK, "#7fa88a", "#6f93c4", "#e3b448", "#8b6aa8", "#f3ece0", "#c2402a", "#4a6fa5"];
const ACCENT = ["#d97757", "#e3b448", "#7fa88a", "#6f93c4", "#c2402a", "#8b6aa8"];

/* ---------------- spec ---------------- */

export const HAIR_STYLES = [
  "none",
  "spiky",
  "curly",
  "bun",
  "beanie",
  "cap",
  "sweep",
  "mohawk",
  "antenna",
  "bow",
  "sprout",
  "headphones",
  "party",
  "long",
  "bob",
  "afro",
] as const;
export const EYE_STYLES = ["dots", "sparkle", "happy", "sleepy", "wink", "round-glasses", "square-glasses", "ovals", "wide"] as const;
export const MOUTH_STYLES = ["smile", "grin", "o", "flat", "smirk", "tongue", "wavy", "cat", "teeth"] as const;

export type DoodleSpec = {
  seed: string;
  tile: string;
  skin: string;
  hairColor: string;
  shirt: string;
  accent: string;
  hair: (typeof HAIR_STYLES)[number];
  eyes: (typeof EYE_STYLES)[number];
  mouth: (typeof MOUTH_STYLES)[number];
  brows: boolean;
  blush: boolean;
  freckles: boolean;
  mustache: boolean;
  nose: boolean;
  /** a few degrees of head tilt, so a row of doodles never looks stamped */
  tilt: number;
  rx: number;
  ry: number;
};

function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length) % items.length];
}

export function doodleSpec(seed: string): DoodleSpec {
  const r = seededRandom(`doodle:${DOODLE_VERSION}:${seed}`);
  const hair = pick(r, HAIR_STYLES);
  const eyes = pick(r, EYE_STYLES);
  return {
    seed,
    tile: pick(r, TILES),
    skin: pick(r, SKIN),
    hairColor: pick(r, HAIR),
    shirt: pick(r, SHIRT),
    accent: pick(r, ACCENT),
    hair,
    eyes,
    mouth: pick(r, MOUTH_STYLES),
    brows: r() < 0.45,
    blush: r() < 0.55,
    freckles: r() < 0.22,
    mustache: r() < 0.09,
    nose: r() < 0.6,
    tilt: (r() - 0.5) * 9,
    rx: 15.5 + r() * 3,
    ry: 17 + r() * 3,
  };
}

/* ---------------- hand-drawn geometry ---------------- */

type Pt = [number, number];
const f = (n: number) => Math.round(n * 100) / 100;

/** Catmull-Rom through the points, as cubic beziers. Closed or open. */
function smooth(points: Pt[], closed: boolean): string {
  const n = points.length;
  if (n < 2) return "";
  const at = (i: number): Pt => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return closed ? `${d} Z` : d;
}

/** A slightly lumpy ellipse: the outline a pen makes when it is not trying too hard. */
export function blob(r: () => number, cx: number, cy: number, rx: number, ry: number, n = 9, jitter = 0.05): string {
  const start = r() * Math.PI * 2;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * jitter;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts, true);
}

/** An open stroke through the points, each nudged a little. */
export function wobble(r: () => number, pts: Pt[], amount = 0.5): string {
  return smooth(
    pts.map(([x, y]) => [x + (r() - 0.5) * amount * 2, y + (r() - 0.5) * amount * 2]),
    false,
  );
}

/* ---------------- the drawing, as plain data ---------------- */

/** One SVG primitive. Kept as data so both React and the PNG export draw from the same source. */
export type Shape =
  | { el: "path"; d: string; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { el: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { el: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill?: string; stroke?: string; sw?: number; opacity?: number };

const SW = 2;

export function drawDoodle(spec: DoodleSpec): { back: Shape[]; body: Shape[]; head: Shape[] } {
  const r = seededRandom(`stroke:${spec.seed}`);
  const cx = 32;
  const cy = 33;
  const { rx, ry } = spec;
  const top = cy - ry;
  const back: Shape[] = [];
  const body: Shape[] = [];
  const head: Shape[] = [];
  const ink = { stroke: INK, sw: SW };

  /* shoulders */
  body.push({ el: "path", d: blob(r, 32, 67, 23, 15, 8, 0.04), fill: spec.shirt, ...ink });
  // a collar notch so the shirt reads as a shirt
  body.push({ el: "path", d: wobble(r, [[26, 53.5], [32, 58], [38, 53.5]], 0.3), fill: "none", ...ink });

  /* hair behind the head */
  if (spec.hair === "long" || spec.hair === "bob") {
    const drop = spec.hair === "long" ? 22 : 9;
    back.push({
      el: "path",
      d: smooth(
        [
          [cx - rx - 3, cy + drop],
          [cx - rx - 4, cy - 2],
          [cx - rx + 2, top - 3],
          [cx, top - 5],
          [cx + rx - 2, top - 3],
          [cx + rx + 4, cy - 2],
          [cx + rx + 3, cy + drop],
          [cx, cy + drop - 4],
        ],
        true,
      ),
      fill: spec.hairColor,
      ...ink,
    });
  }
  if (spec.hair === "afro") {
    const pts: Pt[] = [];
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * (0.92 + (i / 12) * 1.16);
      const k = i % 2 ? 1.02 : 1.14;
      pts.push([cx + Math.cos(a) * (rx + 7) * k, cy - 4 + Math.sin(a) * (ry + 7) * k]);
    }
    back.push({ el: "path", d: smooth(pts, true), fill: spec.hairColor, ...ink });
  }

  /* ears + head */
  head.push({ el: "path", d: blob(r, cx - rx + 0.5, cy + 2, 3.4, 4.2, 6, 0.08), fill: spec.skin, ...ink });
  head.push({ el: "path", d: blob(r, cx + rx - 0.5, cy + 2, 3.4, 4.2, 6, 0.08), fill: spec.skin, ...ink });
  head.push({ el: "path", d: blob(r, cx, cy, rx, ry, 10, 0.045), fill: spec.skin, ...ink });

  /* hair in front */
  const cap = (fringeY: number, sweep = 0): string =>
    smooth(
      [
        [cx - rx - 0.8, cy - 1],
        [cx - rx + 1, top + 2],
        [cx - rx * 0.4, top - 2.5],
        [cx + rx * 0.4, top - 2.5],
        [cx + rx - 1, top + 2],
        [cx + rx + 0.8, cy - 1],
        [cx + rx * 0.55 + sweep, fringeY + 1],
        [cx + sweep * 0.3, fringeY - 1.5],
        [cx - rx * 0.55 + sweep * 0.2, fringeY + 1.5],
      ],
      true,
    );

  switch (spec.hair) {
    case "none":
      head.push({ el: "path", d: wobble(r, [[cx + 3, top + 4], [cx + 7, top + 5.2], [cx + 9.5, top + 8]], 0.2), fill: "none", stroke: INK, sw: 1.4, opacity: 0.45 });
      break;
    case "spiky": {
      const pts: Pt[] = [[cx - rx - 0.5, cy - 2]];
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = cx - rx + t * rx * 2;
        const base = top + 5 + Math.pow(Math.abs(t - 0.5) * 2, 2) * 8;
        pts.push([x, i % 2 ? base - 7 - r() * 3 : base]);
      }
      pts.push([cx + rx + 0.5, cy - 2]);
      let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
      for (const p of pts.slice(1)) d += ` L${f(p[0])},${f(p[1])}`;
      d += ` Q${f(cx)},${f(top + 6)} ${f(pts[0][0])},${f(pts[0][1])} Z`;
      head.push({ el: "path", d, fill: spec.hairColor, ...ink });
      break;
    }
    case "curly":
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.08 + (i / 6) * 0.84);
        head.push({ el: "circle", cx: f(cx + Math.cos(a) * rx * 0.92), cy: f(cy - 3 + Math.sin(a) * ry * 0.92), r: f(4.6 + r() * 1.2), fill: spec.hairColor, ...ink });
      }
      break;
    case "bun":
      back.push({ el: "path", d: blob(r, cx, top - 4, 6.5, 5.5, 7, 0.06), fill: spec.hairColor, ...ink });
      head.push({ el: "path", d: cap(top + 8), fill: spec.hairColor, ...ink });
      break;
    case "beanie":
      head.push({
        el: "path",
        d: smooth([[cx - rx - 1.5, top + 9], [cx - rx + 1, top - 2], [cx, top - 7], [cx + rx - 1, top - 2], [cx + rx + 1.5, top + 9], [cx, top + 7]], true),
        fill: spec.accent,
        ...ink,
      });
      head.push({ el: "path", d: wobble(r, [[cx - rx - 1, top + 6.5], [cx, top + 4.2], [cx + rx + 1, top + 6.5]], 0.3), fill: "none", ...ink });
      head.push({ el: "path", d: blob(r, cx, top - 8, 3.6, 3.4, 6, 0.1), fill: PAPER, ...ink });
      break;
    case "cap":
      head.push({ el: "path", d: smooth([[cx - rx - 0.5, top + 8], [cx - rx + 2, top - 1], [cx + 2, top - 5], [cx + rx - 1, top], [cx + rx + 0.5, top + 8], [cx, top + 6]], true), fill: spec.accent, ...ink });
      head.push({ el: "path", d: smooth([[cx + 1, top + 7], [cx + rx + 11, top + 8.5], [cx + rx + 10, top + 11], [cx + 2, top + 9.5]], true), fill: spec.accent, ...ink });
      head.push({ el: "circle", cx: f(cx - 1), cy: f(top - 4), r: 1.6, fill: INK });
      break;
    case "sweep":
      head.push({ el: "path", d: cap(top + 9, 6), fill: spec.hairColor, ...ink });
      break;
    case "mohawk": {
      const pts: Pt[] = [];
      for (let i = 0; i < 5; i++) pts.push([cx - 4 + i * 2, i % 2 ? top - 2 : top - 10 - r() * 2]);
      head.push({ el: "path", d: `M${f(cx - 6)},${f(top + 4)} ${pts.map((p) => `L${f(p[0])},${f(p[1])}`).join(" ")} L${f(cx + 6)},${f(top + 4)} Z`, fill: spec.accent, ...ink });
      break;
    }
    case "antenna":
      head.push({ el: "path", d: wobble(r, [[cx + 1, top + 1], [cx + 3, top - 6], [cx + 6, top - 10]], 0.3), fill: "none", ...ink });
      head.push({ el: "circle", cx: f(cx + 6.5), cy: f(top - 11), r: 3, fill: spec.accent, ...ink });
      head.push({ el: "path", d: cap(top + 6.5), fill: spec.hairColor, ...ink });
      break;
    case "bow":
      head.push({ el: "path", d: cap(top + 8), fill: spec.hairColor, ...ink });
      head.push({ el: "path", d: smooth([[cx + rx - 5, top + 2], [cx + rx + 3, top - 4], [cx + rx + 4, top + 4]], true), fill: spec.accent, ...ink });
      head.push({ el: "path", d: smooth([[cx + rx - 5, top + 2], [cx + rx - 13, top - 3], [cx + rx - 12, top + 6]], true), fill: spec.accent, ...ink });
      head.push({ el: "circle", cx: f(cx + rx - 5), cy: f(top + 2), r: 2, fill: spec.accent, ...ink });
      break;
    case "sprout":
      head.push({ el: "path", d: wobble(r, [[cx, top + 1], [cx - 0.5, top - 5], [cx + 0.5, top - 9]], 0.2), fill: "none", ...ink });
      head.push({ el: "path", d: smooth([[cx, top - 7], [cx - 7, top - 12], [cx - 9, top - 8], [cx - 3, top - 5]], true), fill: "#7fa88a", ...ink });
      head.push({ el: "path", d: smooth([[cx + 0.5, top - 8], [cx + 6, top - 13], [cx + 8, top - 9], [cx + 3, top - 6]], true), fill: "#9cc4a3", ...ink });
      break;
    case "headphones":
      head.push({ el: "path", d: cap(top + 7), fill: spec.hairColor, ...ink });
      head.push({ el: "path", d: wobble(r, [[cx - rx - 1, cy - 1], [cx - rx + 1, top - 2], [cx, top - 6], [cx + rx - 1, top - 2], [cx + rx + 1, cy - 1]], 0.2), fill: "none", stroke: INK, sw: 3 });
      head.push({ el: "path", d: blob(r, cx - rx - 1, cy + 1, 3.6, 5.4, 6, 0.05), fill: spec.accent, ...ink });
      head.push({ el: "path", d: blob(r, cx + rx + 1, cy + 1, 3.6, 5.4, 6, 0.05), fill: spec.accent, ...ink });
      break;
    case "party":
      head.push({ el: "path", d: `M${f(cx - 8)},${f(top + 3)} L${f(cx + 1)},${f(top - 17)} L${f(cx + 9)},${f(top + 2)} Q${f(cx)},${f(top + 6)} ${f(cx - 8)},${f(top + 3)} Z`, fill: spec.accent, ...ink });
      head.push({ el: "path", d: wobble(r, [[cx - 4.5, top - 5], [cx + 5, top - 6.5]], 0.2), fill: "none", stroke: PAPER, sw: 1.6 });
      head.push({ el: "circle", cx: f(cx + 1), cy: f(top - 18), r: 2.6, fill: PAPER, ...ink });
      break;
    case "long":
    case "bob":
      head.push({ el: "path", d: cap(top + 9, -4), fill: spec.hairColor, ...ink });
      break;
    case "afro":
      break;
  }

  /* face */
  const ey = cy + 1;
  const ex = rx * 0.4;
  const eyePair = (draw: (x: number, side: -1 | 1) => Shape[]) => [...draw(cx - ex, -1), ...draw(cx + ex, 1)];

  switch (spec.eyes) {
    case "dots":
      head.push(...eyePair((x) => [{ el: "circle", cx: f(x), cy: f(ey), r: 1.9, fill: INK }]));
      break;
    case "sparkle":
      head.push(
        ...eyePair((x) => [
          { el: "circle", cx: f(x), cy: f(ey), r: 2.7, fill: INK },
          { el: "circle", cx: f(x + 0.9), cy: f(ey - 0.9), r: 0.9, fill: PAPER },
        ]),
      );
      break;
    case "happy":
      head.push(...eyePair((x) => [{ el: "path", d: wobble(r, [[x - 2.8, ey + 1], [x, ey - 2], [x + 2.8, ey + 1]], 0.15), fill: "none", ...ink }]));
      break;
    case "sleepy":
      head.push(...eyePair((x) => [{ el: "path", d: wobble(r, [[x - 2.8, ey - 0.5], [x, ey + 1.6], [x + 2.8, ey - 0.5]], 0.15), fill: "none", ...ink }]));
      break;
    case "wink":
      head.push({ el: "circle", cx: f(cx - ex), cy: f(ey), r: 2.1, fill: INK });
      head.push({ el: "path", d: wobble(r, [[cx + ex - 2.8, ey + 0.6], [cx + ex, ey - 1.8], [cx + ex + 2.8, ey + 0.6]], 0.15), fill: "none", ...ink });
      break;
    case "round-glasses":
      head.push(
        ...eyePair((x) => [
          { el: "circle", cx: f(x), cy: f(ey), r: 4.4, fill: PAPER, stroke: INK, sw: 1.8, opacity: 0.95 },
          { el: "circle", cx: f(x), cy: f(ey + 0.4), r: 1.5, fill: INK },
        ]),
      );
      head.push({ el: "path", d: wobble(r, [[cx - ex + 4.4, ey - 0.6], [cx, ey - 1.6], [cx + ex - 4.4, ey - 0.6]], 0.1), fill: "none", stroke: INK, sw: 1.6 });
      break;
    case "square-glasses":
      head.push(
        ...eyePair((x) => [
          { el: "path", d: smooth([[x - 4.5, ey - 3.4], [x + 4.5, ey - 3.6], [x + 4.3, ey + 3.2], [x - 4.3, ey + 3.4]], true), fill: PAPER, stroke: INK, sw: 1.8 },
          { el: "circle", cx: f(x), cy: f(ey), r: 1.5, fill: INK },
        ]),
      );
      head.push({ el: "path", d: wobble(r, [[cx - ex + 4.5, ey - 1], [cx + ex - 4.5, ey - 1]], 0.1), fill: "none", stroke: INK, sw: 1.6 });
      break;
    case "ovals":
      head.push(...eyePair((x) => [{ el: "ellipse", cx: f(x), cy: f(ey), rx: 1.4, ry: 2.6, fill: INK }]));
      break;
    case "wide":
      head.push(
        ...eyePair((x, side) => [
          { el: "circle", cx: f(x), cy: f(ey), r: 3.3, fill: PAPER, ...ink },
          { el: "circle", cx: f(x + side * 0.7), cy: f(ey + 0.5), r: 1.5, fill: INK },
        ]),
      );
      break;
  }

  if (spec.brows && !spec.eyes.endsWith("glasses")) {
    head.push(...eyePair((x, side) => [{ el: "path", d: wobble(r, [[x - 2.6, ey - 5 + side * 0.4], [x + 2.6, ey - 5.6 - side * 0.4]], 0.15), fill: "none", stroke: INK, sw: 1.7 }]));
  }

  if (spec.blush) {
    head.push(...eyePair((x, side) => [{ el: "ellipse", cx: f(x + side * 2.6), cy: f(ey + 5.4), rx: 3, ry: 1.8, fill: "#e8806a", opacity: 0.35 }]));
  }
  if (spec.freckles) {
    head.push(
      ...eyePair((x, side) =>
        [0, 1, 2].map<Shape>((i) => ({ el: "circle", cx: f(x + side * (1 + i * 1.6)), cy: f(ey + 4.2 + (i % 2) * 1.2), r: 0.55, fill: INK, opacity: 0.6 })),
      ),
    );
  }
  if (spec.nose) {
    head.push({ el: "path", d: wobble(r, [[cx + 0.4, ey + 2.2], [cx - 1.2, ey + 4.6], [cx + 0.8, ey + 5]], 0.1), fill: "none", stroke: INK, sw: 1.5 });
  }

  /* mouth */
  const my = cy + 9;
  switch (spec.mouth) {
    case "smile":
      head.push({ el: "path", d: wobble(r, [[cx - 4.6, my - 1], [cx, my + 2.8], [cx + 4.6, my - 1]], 0.15), fill: "none", ...ink });
      break;
    case "grin":
      head.push({ el: "path", d: `M${f(cx - 5.5)},${f(my - 1.5)} Q${f(cx)},${f(my + 7)} ${f(cx + 5.5)},${f(my - 1.5)} Z`, fill: INK, stroke: INK, sw: 1.6 });
      head.push({ el: "ellipse", cx: f(cx), cy: f(my + 2.4), rx: 2.4, ry: 1.3, fill: "#e8806a" });
      break;
    case "teeth":
      head.push({ el: "path", d: `M${f(cx - 5.5)},${f(my - 1.5)} Q${f(cx)},${f(my + 6.5)} ${f(cx + 5.5)},${f(my - 1.5)} Z`, fill: PAPER, stroke: INK, sw: 1.8 });
      head.push({ el: "path", d: wobble(r, [[cx - 4.6, my + 0.6], [cx + 4.6, my + 0.6]], 0.1), fill: "none", stroke: INK, sw: 1.2 });
      break;
    case "o":
      head.push({ el: "ellipse", cx: f(cx), cy: f(my + 0.5), rx: 2, ry: 2.6, fill: INK });
      break;
    case "flat":
      head.push({ el: "path", d: wobble(r, [[cx - 3.6, my], [cx, my + 0.4], [cx + 3.6, my - 0.2]], 0.15), fill: "none", ...ink });
      break;
    case "smirk":
      head.push({ el: "path", d: wobble(r, [[cx - 4, my + 0.8], [cx + 1, my + 1.8], [cx + 4.6, my - 1.4]], 0.15), fill: "none", ...ink });
      break;
    case "tongue":
      head.push({ el: "path", d: `M${f(cx)},${f(my + 1.4)} q${f(-0.3)},${f(4)} ${f(2.4)},${f(3.6)} q${f(2.2)},${f(-0.4)} ${f(1.6)},${f(-3.6)} Z`, fill: "#e8806a", stroke: INK, sw: 1.4 });
      head.push({ el: "path", d: wobble(r, [[cx - 4.6, my - 1], [cx, my + 2], [cx + 4.6, my - 1]], 0.15), fill: "none", ...ink });
      break;
    case "wavy":
      head.push({ el: "path", d: `M${f(cx - 5)},${f(my)} q${f(2.5)},${f(-2.2)} ${f(5)},0 t${f(5)},0`, fill: "none", ...ink });
      break;
    case "cat":
      head.push({ el: "path", d: `M${f(cx - 4.8)},${f(my - 0.8)} Q${f(cx - 2.4)},${f(my + 2.8)} ${f(cx)},${f(my)} Q${f(cx + 2.4)},${f(my + 2.8)} ${f(cx + 4.8)},${f(my - 0.8)}`, fill: "none", ...ink });
      break;
  }

  if (spec.mustache) {
    head.push({
      el: "path",
      d: `M${f(cx)},${f(my - 3)} q${f(-3)},${f(-1.6)} ${f(-6)},${f(1)} q${f(3)},${f(0.6)} ${f(6)},${f(-0.6)} q${f(3)},${f(1.2)} ${f(6)},${f(0.6)} q${f(-3)},${f(-2.6)} ${f(-6)},${f(-1)} Z`,
      fill: spec.hairColor === PAPER ? INK : spec.hairColor,
      stroke: INK,
      sw: 1.2,
    });
  }

  return { back, body, head };
}

/* ---------------- standalone SVG ---------------- */

function shapeToSvg(s: Shape): string {
  const common = `fill="${s.fill ?? "none"}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.sw ?? SW}" stroke-linecap="round" stroke-linejoin="round"` : ""}${
    s.opacity !== undefined ? ` opacity="${s.opacity}"` : ""
  }`;
  if (s.el === "path") return `<path d="${s.d}" ${common}/>`;
  if (s.el === "circle") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${common}/>`;
  return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" ${common}/>`;
}

/**
 * The doodle as a self-contained SVG document. Used to rasterise the chosen doodle into the PNG
 * Clerk stores as the profile image, so the picture is the same one the app draws.
 */
export function doodleSvgString(seed: string, size = 256): string {
  const spec = doodleSpec(seed);
  const { back, body, head } = drawDoodle(spec);
  const tilt = `rotate(${f(spec.tilt)} 32 40)`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">`,
    `<defs><clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath></defs>`,
    `<g clip-path="url(#c)">`,
    `<rect width="64" height="64" fill="${spec.tile}"/>`,
    ...body.map(shapeToSvg),
    `<g transform="${tilt}">`,
    ...back.map(shapeToSvg),
    ...head.map(shapeToSvg),
    `</g></g></svg>`,
  ].join("");
}
