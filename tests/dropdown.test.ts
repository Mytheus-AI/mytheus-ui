// Run: npm test
// The shared dropdown's rules: keyboard movement skips disabled options and stops at the ends,
// type to jump (and cycle on a repeated letter), grouping, and a panel that stays on screen.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  drawOrder,
  firstEnabled,
  groupOptions,
  lastEnabled,
  openingIndex,
  placePanel,
  stepEnabled,
  typeaheadMatch,
} from "../src/lib/dropdown.ts";

const people = [
  { label: "No owner" },
  { label: "Priya Nair" },
  { label: "Pricing desk", disabled: true },
  { label: "Peter Hall" },
  { label: "Raj Patel" },
  { label: "Sarah Okafor", disabled: true },
];

test("arrows skip disabled options and stop at the ends", () => {
  assert.equal(stepEnabled(people, 1, 1), 3);
  assert.equal(stepEnabled(people, 3, -1), 1);
  assert.equal(stepEnabled(people, 4, 1), 4, "Sarah is disabled, so Raj is the last stop");
  assert.equal(stepEnabled(people, 0, -1), 0);
  assert.equal(stepEnabled(people, -1, 1), 0, "from nothing, down starts at the first");
  assert.equal(stepEnabled(people, -1, -1), 4, "from nothing, up starts at the last enabled");
  assert.equal(stepEnabled(people, 0, 1, 10), 4, "page down moves as far as it can");
});

test("first, last and where opening starts", () => {
  assert.equal(firstEnabled([{ label: "a", disabled: true }, { label: "b" }]), 1);
  assert.equal(lastEnabled(people), 4);
  assert.equal(firstEnabled([{ label: "a", disabled: true }]), -1);
  assert.equal(openingIndex(people, 3), 3);
  assert.equal(openingIndex(people, 2), 0, "a disabled choice opens at the first enabled");
  assert.equal(openingIndex(people, -1), 0);
});

test("type to jump: a prefix match, a repeated letter cycles, disabled never matches", () => {
  assert.equal(typeaheadMatch(people, "r", 0), 4);
  assert.equal(typeaheadMatch(people, "p", 0), 1);
  assert.equal(typeaheadMatch(people, "p", 1), 3, "p again moves past Priya, skipping the disabled desk");
  assert.equal(typeaheadMatch(people, "pp", 3), 1, "a repeated letter wraps around");
  assert.equal(typeaheadMatch(people, "pri", 1), 1, "a longer prefix keeps the match it is on");
  assert.equal(typeaheadMatch(people, "PRIC", 0), -1, "the only match is disabled");
  assert.equal(typeaheadMatch(people, "s", 0), -1);
  assert.equal(typeaheadMatch(people, "", 0), -1);
});

test("groups keep first-seen order and the draw order follows them", () => {
  const opts = [
    { v: "a", group: "Mine" },
    { v: "b", group: "Team" },
    { v: "c", group: "Mine" },
    { v: "d" },
  ];
  const g = groupOptions(opts);
  assert.deepEqual(
    g.map((x) => [x.group, x.items.map((i) => i.option.v)]),
    [
      ["Mine", ["a", "c"]],
      ["Team", ["b"]],
      [null, ["d"]],
    ],
  );
  assert.deepEqual(
    drawOrder(opts).map((o) => o.v),
    ["a", "c", "b", "d"],
  );
});

test("the panel opens below, flips above near the bottom, and stays inside the viewport", () => {
  const vp = { width: 400, height: 800 };
  const below = placePanel({ top: 100, left: 20, width: 200, height: 44 }, { width: 160, height: 200 }, vp);
  assert.equal(below.side, "bottom");
  assert.equal(below.top, 150);
  assert.equal(below.width, 200, "at least as wide as the trigger");

  const flipped = placePanel({ top: 700, left: 20, width: 200, height: 44 }, { width: 160, height: 300 }, vp);
  assert.equal(flipped.side, "top");
  assert.ok(flipped.top >= 8, "never above the viewport");
  assert.ok(flipped.top + Math.min(300, flipped.maxHeight) <= 700 - 6 + 1);

  const wide = placePanel({ top: 100, left: 300, width: 90, height: 36 }, { width: 380, height: 100 }, vp);
  assert.ok(wide.left + wide.width <= 400 - 8, "shifted left to stay on screen");
  assert.ok(wide.left >= 8);

  const end = placePanel({ top: 100, left: 200, width: 100, height: 36 }, { width: 150, height: 100 }, vp, { align: "end" });
  assert.equal(end.left + end.width, 300, "end-aligned to the trigger's right edge");

  const capped = placePanel({ top: 10, left: 0, width: 50, height: 30 }, { width: 2000, height: 100 }, { width: 1440, height: 900 });
  assert.equal(capped.width, 440, "long labels are truncated past 440 px, not drawn across the screen");
});
