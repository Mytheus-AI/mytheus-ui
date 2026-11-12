/* ================================================================== */
/*  Avatar seeds.                                                      */
/*                                                                     */
/*  A face is fully described by a short seed string. The same seed    */
/*  always gives the same face, on the server and in the browser, so   */
/*  the only thing that ever needs storing is the seed (Clerk          */
/*  `unsafeMetadata.doodle`, `agent_avatar_seed`) plus, for everyone   */
/*  else who reads a user's picture, the rendered PNG that Clerk       */
/*  mirrors into `users.avatar_url` through the `user.updated`         */
/*  webhook.                                                           */
/*                                                                     */
/*  The file and its names say "doodle" because the faces were ink     */
/*  doodles first. They are plush felt characters now (lib/plush.ts    */
/*  turns a seed into one); the seeds, and everything that stores or   */
/*  derives them, are unchanged.                                       */
/*                                                                     */
/*  Someone with no stored seed gets a face seeded from their email,   */
/*  id or name, so every person in the product has one, never          */
/*  initials.                                                          */
/*                                                                     */
/*  Pure functions only: no React, no DOM, no randomness that is not   */
/*  derived from the seed (except `randomDoodleSeed`). The hand-drawn  */
/*  line helpers at the end (`blob`, `wobble`) still draw the auth     */
/*  pages' meeting table.                                              */
/* ================================================================== */

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
