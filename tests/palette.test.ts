// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { normalize, pushRecent, recentEntries, scoreEntry, searchPalette, type PaletteEntry } from "../src/lib/palette.ts";

const e = (group: PaletteEntry["group"], label: string, over: Partial<PaletteEntry> = {}): PaletteEntry => ({
  key: `${group}:${label}`,
  group,
  label,
  href: `/${group}/${label}`,
  ...over,
});

test("normalize folds case, accents and punctuation", () => {
  assert.equal(normalize("  Café-Roadmap  Q4! "), "cafe roadmap q4");
});

test("scores rank exact over prefix over word start over substring over loose", () => {
  const q = "plan";
  assert.equal(scoreEntry(q, e("pages", "Plan")), 100);
  assert.equal(scoreEntry(q, e("pages", "Planning review")), 80);
  assert.equal(scoreEntry(q, e("pages", "Hiring plan")), 60);
  assert.equal(scoreEntry(q, e("pages", "Floorplanning")), 40);
  assert.equal(scoreEntry("hiplan", e("pages", "Hiring plan")), 10);
  assert.equal(scoreEntry("zzz", e("pages", "Hiring plan")), 0);
});

test("every typed word starting a word of the label beats a plain substring", () => {
  assert.equal(scoreEntry("q4 road", e("meetings", "Roadmap review Q4")), 50);
});

test("keywords match but are not required to be shown", () => {
  assert.equal(scoreEntry("org chart", e("pages", "People", { keywords: "org chart team" })), 25);
});

test("an empty query shows recent, actions and pages only, in that order", () => {
  const groups = searchPalette("", [
    e("pages", "Home"),
    e("meetings", "Weekly"),
    e("actions", "Start a new meeting"),
    e("recent", "Hiring plan"),
  ]);
  assert.deepEqual(
    groups.map((g) => g.group),
    ["recent", "actions", "pages"],
  );
});

test("with a query, groups follow their best match", () => {
  const groups = searchPalette("raj", [
    e("pages", "Projects", { keywords: "raj" }),
    e("people", "Raj Patel"),
    e("meetings", "Sync with Raj"),
  ]);
  assert.deepEqual(
    groups.map((g) => g.group),
    ["people", "meetings", "pages"],
  );
});

test("ties go to the newest, then alphabetical; groups are capped", () => {
  const groups = searchPalette(
    "weekly",
    [
      e("meetings", "Weekly b", { at: "2026-11-01T00:00:00Z" }),
      e("meetings", "Weekly a", { at: "2026-11-01T00:00:00Z" }),
      e("meetings", "Weekly new", { at: "2026-11-10T00:00:00Z" }),
      e("meetings", "Weekly old", { at: "2026-10-01T00:00:00Z" }),
    ],
    3,
  );
  assert.deepEqual(
    groups[0].entries.map((x) => x.label),
    ["Weekly new", "Weekly a", "Weekly b"],
  );
});

test("a recent item is not listed twice", () => {
  const groups = searchPalette("hiring", [
    e("recent", "Hiring plan", { href: "/meetings/1" }),
    e("meetings", "Hiring plan", { href: "/meetings/1" }),
  ]);
  assert.equal(groups.flatMap((g) => g.entries).length, 1);
});

test("recent items move to the front without duplicates and are capped", () => {
  let list = [{ label: "A", href: "/a" }, { label: "B", href: "/b" }];
  list = pushRecent(list, { label: "B again", href: "/b" }, 2);
  assert.deepEqual(list.map((r) => r.label), ["B again", "A"]);
  list = pushRecent(list, { label: "C", href: "/c" }, 2);
  assert.deepEqual(list.map((r) => r.href), ["/c", "/b"]);
  assert.equal(recentEntries(list)[0].group, "recent");
});
