// Run: npm test
// The guard for loading skeletons (components/ui/Page.tsx, "skeletons"): every screen that reads
// data has its own loading.tsx, so it never falls back to a parent's skeleton of another shape, and
// each skeleton keeps its page's top-level frame: the same Page width (wide or the reading width)
// and a title row exactly when the page has one. The CT pairs in tests/e2e/skeletons measure the
// rest (regions, gutters, columns) in a browser.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const SRC = path.resolve(import.meta.dirname, "../src");
const APP = path.join(SRC, "app");
const GROUPS = ["(app)", "(admin)", "(auth)/onboarding", "(call)"];

/* Screens with no loading.tsx of their own, and why. */
const EXEMPT: Record<string, string> = {
  "(auth)/onboarding/organization": "renders Clerk's organization chooser with no server read",
  "(call)/meetings/[meetingId]/join": "drawn by the (call) group's room frame, which is the pre-join's own frame",
  "(call)/meetings/[meetingId]/room": "drawn by the (call) group's room frame",
};

/* Pages whose PageHead is drawn only in the failed-read branch; the loaded page opens without one. */
const HEAD_ONLY_ON_ERROR = new Set(["(app)/agent"]);

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    return name === "page.tsx" ? [full] : [];
  });
}

const read = (f: string) => readFileSync(f, "utf8");
const rel = (f: string) => path.relative(APP, path.dirname(f));

/** A page that only sends you elsewhere renders nothing a skeleton could stand for. */
function redirectOnly(src: string) {
  return /\bredirect\(/.test(src) && !/return\s*\(?\s*</.test(src);
}

/** The file plus the components it imports from src/components (one level), where a view's frame lives. */
function withImports(file: string): string {
  const src = read(file);
  const more = [...src.matchAll(/from "@\/components\/([^"]+)"/g)]
    .map((m) => ["tsx", "ts"].map((ext) => path.join(SRC, "components", `${m[1]}.${ext}`)).find(existsSync))
    .filter((f): f is string => Boolean(f) && !/components\/ui\//.test(f!));
  return [src, ...more.map(read)].join("\n");
}

/** The layouts above a route inside its group, nearest first. */
function layoutsOf(dir: string): string[] {
  const out: string[] = [];
  for (let d = dir; d.startsWith(APP) && d !== APP; d = path.dirname(d)) {
    const l = path.join(d, "layout.tsx");
    if (existsSync(l)) out.push(l);
  }
  return out;
}

const screens = GROUPS.flatMap((g) => pages(path.join(APP, g))).filter((f) => !redirectOnly(read(f)));

test("every screen that reads data has its own loading.tsx", () => {
  const missing = screens.filter((f) => !EXEMPT[rel(f)] && !existsSync(path.join(path.dirname(f), "loading.tsx"))).map(rel);
  assert.deepEqual(missing, [], `Add a loading.tsx shaped like the page (components/ui/Page.tsx skeleton kit):\n${missing.join("\n")}`);
});

test("each group root has a fallback skeleton", () => {
  for (const g of ["(app)", "(admin)", "(call)"]) assert.ok(existsSync(path.join(APP, g, "loading.tsx")), `${g}/loading.tsx`);
});

test("a skeleton keeps its page's Page width and title row", () => {
  const wrong: string[] = [];
  for (const f of screens) {
    const loading = path.join(path.dirname(f), "loading.tsx");
    if (!existsSync(loading)) continue;
    const page = withImports(f);
    const skel = withImports(loading);
    // a console layout (My work, Settings, Workspace, ops) owns the h1 and the frame; its tabs'
    // skeletons draw only the body
    const layoutHead = layoutsOf(path.dirname(f)).some((l) => /<PageHead\b/.test(read(l)));
    const pageRead = /<Page\b[^>]*width="read"/.test(page);
    const skelRead = /<Page\b[^>]*width="read"|width=\{?"read"\}?/.test(skel);
    if (!layoutHead && /<Page\b/.test(page) && pageRead !== skelRead) wrong.push(`${rel(f)}: page is ${pageRead ? "read" : "wide"}, skeleton is ${skelRead ? "read" : "wide"}`);
    const pageHead = /<PageHead\b/.test(page) && !HEAD_ONLY_ON_ERROR.has(rel(f));
    const skelHead = /<PageHeadSkeleton\b|<PageHead\b|PageSkeleton\b/.test(skel);
    if (!layoutHead && pageHead !== skelHead) wrong.push(`${rel(f)}: page ${pageHead ? "has" : "has no"} title row, skeleton ${skelHead ? "has" : "has none"}`);
    if (layoutHead && /<PageHeadSkeleton\b|<Page\b/.test(read(loading))) wrong.push(`${rel(f)}: the layout draws the frame and title row; the skeleton should draw only the body`);
  }
  assert.deepEqual(wrong, [], wrong.join("\n"));
});

test("skeletons use the one kit: busy, one polite label, no hand-made pulse", () => {
  const bad: string[] = [];
  for (const f of screens) {
    const loading = path.join(path.dirname(f), "loading.tsx");
    if (!existsSync(loading)) continue;
    const src = read(loading);
    if (/animate-pulse|role="status"/.test(src) && !/call-state/.test(src)) bad.push(`${rel(f)}: draws its own status or pulse; use Page label / SkeletonSection and Bone`);
    if (!/label=|aria-busy/.test(withImports(loading))) bad.push(`${rel(f)}: no loading label`);
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("the guard itself tells a redirect from a page", () => {
  assert.ok(redirectOnly('export default function P() { redirect("/x"); }'));
  assert.ok(!redirectOnly("export default function P() { if (a) redirect('/x'); return <Page />; }"));
});
