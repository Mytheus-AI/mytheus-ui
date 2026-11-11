import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

/* Skeleton against page: the shapes of the main regions, and how far each moves when the real
   content replaces the skeleton.

   A region is a laid-out child of the page frame (the frame is found by walking down single-child
   wrappers from the shell's <main>: `.mx-meet`, Page, the reading-width box). Region 0 is usually
   the title row; for every region laid out as a grid or a flex row of several children, its
   children are regions too (the columns and the cards in a grid). The sr-only status line and
   anything absolutely placed are not regions.

   `shift` is the largest move of any region's left edge, width or gap to what sits above it (the
   lowest region stacked above it in the same parent); `headDh` is how much the first region's height changes (the
   title row). Card heights follow the data, so they are reported (`dh`) but not counted as a
   shift; a missing or extra region is reported in `missing`. */

export type Region = { path: string; x: number; y: number; w: number; h: number; tag: string };
export type Delta = { path: string; dx: number; dy: number; dw: number; dh: number };
export type Comparison = { regions: number; pageRegions: number; missing: string[]; shift: number; headDh: number; worst: Delta | null; deltas: Delta[] };

export const SHOTS_DIR = process.env.SKELETON_SHOTS_DIR ?? "";

export async function regions(page: Page): Promise<Region[]> {
  return page.evaluate(() => {
    const root = document.querySelector("[data-skel-root]");
    if (!root) return [];
    const shown = (el: Element) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.position !== "absolute" && cs.position !== "fixed" && cs.visibility !== "hidden" && r.width > 1 && r.height > 1;
    };
    const kids = (el: Element) => Array.from(el.children).filter(shown);
    let frame: Element = root;
    for (let k = kids(frame); k.length === 1; k = kids(frame)) frame = k[0];
    const fr = frame.getBoundingClientRect();
    const box = (el: Element, p: string) => {
      const r = el.getBoundingClientRect();
      return { path: p, x: Math.round(r.left - fr.left), y: Math.round(r.top - fr.top), w: Math.round(r.width), h: Math.round(r.height), tag: el.tagName.toLowerCase() };
    };
    const out: { path: string; x: number; y: number; w: number; h: number; tag: string }[] = [box(frame, "frame")];
    kids(frame).forEach((c, i) => {
      out.push(box(c, `${i}`));
      const d = getComputedStyle(c).display;
      const inner = kids(c);
      if ((d === "grid" || d === "flex") && inner.length > 1) inner.forEach((g, j) => out.push(box(g, `${i}.${j}`)));
    });
    return out;
  });
}

export function compare(skeleton: Region[], loaded: Region[]): Comparison {
  const byPath = new Map(loaded.map((r) => [r.path, r]));
  const raw = new Map<string, Delta>();
  const missing: string[] = [];
  for (const s of skeleton) {
    const p = byPath.get(s.path);
    if (!p) {
      missing.push(s.path);
      continue;
    }
    raw.set(s.path, { path: s.path, dx: p.x - s.x, dy: p.y - s.y, dw: p.w - s.w, dh: p.h - s.h });
  }
  for (const p of loaded) if (!skeleton.some((s) => s.path === p.path)) missing.push(`+${p.path}`);
  // A region's own move: its top's change less what its parent moved and what the siblings
  // stacked above it grew by (a longer list pushing the next card down is content, not a shift).
  const parentOf = (p: string) => (p === "frame" ? null : p.includes(".") ? p.slice(0, p.lastIndexOf(".")) : "frame");
  const deltas: Delta[] = [];
  for (const s of skeleton) {
    const d = raw.get(s.path);
    if (!d) continue;
    const parent = parentOf(s.path);
    // The region's own move: the change in its gap to what is stacked above it inside the same
    // parent (the lowest bottom edge above it), or to the parent's top when nothing is above. A
    // longer list pushing the next card down changes no gap, so it is content, not a shift.
    const above = skeleton.filter((sib) => sib.path !== s.path && parentOf(sib.path) === parent && sib.y + sib.h <= s.y + 1 && byPath.has(sib.path));
    let dy: number;
    if (above.length) {
      const sBottom = Math.max(...above.map((x) => x.y + x.h));
      const pBottom = Math.max(...above.map((x) => byPath.get(x.path)!.y + byPath.get(x.path)!.h));
      dy = byPath.get(s.path)!.y - pBottom - (s.y - sBottom);
    } else {
      dy = d.dy - (parent ? (raw.get(parent)?.dy ?? 0) : 0);
    }
    deltas.push({ ...d, dy });
  }
  let shift = 0;
  let worst: Delta | null = null;
  for (const d of deltas) {
    const m = Math.max(Math.abs(d.dx), Math.abs(d.dy), Math.abs(d.dw));
    if (m > shift) {
      shift = m;
      worst = d;
    }
  }
  const head = deltas.find((d) => d.path === "0");
  return {
    regions: skeleton.filter((r) => r.path !== "frame" && !r.path.includes(".")).length,
    pageRegions: loaded.filter((r) => r.path !== "frame" && !r.path.includes(".")).length,
    missing,
    shift,
    headDh: head ? head.dh : 0,
    worst,
    deltas,
  };
}

/** Writes a pair's numbers next to its screenshots. */
export function record(name: string, data: unknown) {
  if (!SHOTS_DIR) return;
  mkdirSync(SHOTS_DIR, { recursive: true });
  writeFileSync(path.join(SHOTS_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

export function shot(name: string) {
  return path.join(SHOTS_DIR, `${name}.png`);
}

/** What every skeleton must be for assistive tech: busy, one polite line, nothing to focus. */
export async function skeletonA11y(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-skel-root]")!;
    const busy = root.querySelectorAll("[aria-busy='true']").length;
    const status = Array.from(root.querySelectorAll("[role='status']")).map((s) => s.textContent?.trim() ?? "");
    const focusable = Array.from(
      root.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']), [contenteditable='true']"),
    ).map((e) => e.outerHTML.slice(0, 80));
    return { busy, status, focusable };
  });
}
