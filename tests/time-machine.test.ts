// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addDays,
  addMonths,
  clampDay,
  daysBetween,
  isDate,
  monthTicks,
  presets,
  readState,
  scrubRange,
  topicSuggestions,
  writeState,
} from "../src/lib/time-machine.ts";

const TODAY = "2026-11-11";

test("day arithmetic is whole UTC days", () => {
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
  assert.equal(addMonths("2026-03-31", -1), "2026-02-28");
  assert.equal(addMonths("2026-11-11", -12), "2025-11-11");
  assert.equal(daysBetween("2026-01-01", "2026-12-31"), 364);
  assert.equal(clampDay("2030-01-01", "2026-01-01", TODAY), TODAY);
  assert.ok(isDate("2026-06-30") && !isDate("2026-13-01") && !isDate("June"));
});

test("the scrubber spans at least a year, back to the first record", () => {
  assert.deepEqual(scrubRange(null, TODAY), { min: "2025-11-11", max: TODAY, span: 365 });
  assert.equal(scrubRange("2024-03-01", TODAY).min, "2024-03-01");
  assert.equal(scrubRange("2026-10-01", TODAY).min, "2025-11-11");
  assert.equal(presets(TODAY)[2].date, "2026-08-11");
});

test("month ticks sit inside the track and thin out", () => {
  const ticks = monthTicks("2025-11-11", TODAY);
  assert.ok(ticks.length <= 7 && ticks.length >= 5);
  assert.ok(ticks.every((t) => t.at > 0 && t.at <= 1));
  assert.equal(ticks[0].label, "Dec 2025");
  assert.ok(ticks.some((t) => t.label === "Feb 2026"));
});

test("the URL state round-trips and refuses the future", () => {
  const s = readState({ mode: "compare", from: "2026-10-01", to: "2026-06-01", topic: "  pricing  " }, TODAY);
  assert.deepEqual(s, { mode: "compare", asOf: TODAY, from: "2026-06-01", to: "2026-10-01", topic: "pricing" });
  assert.equal(writeState(s, TODAY), "?mode=compare&from=2026-06-01&to=2026-10-01&topic=pricing");
  const future = readState({ as_of: "2031-01-01", mode: "nonsense" }, TODAY);
  assert.equal(future.mode, "as-of");
  assert.equal(future.asOf, TODAY);
  assert.equal(writeState(future, TODAY), "");
  assert.equal(writeState({ ...future, asOf: "2026-06-30" }, TODAY), "?as_of=2026-06-30");
});

test("topic suggestions are the words that recur", () => {
  const out = topicSuggestions([
    "Price the starter plan at 19 dollars",
    "Offer annual pricing at 290 dollars",
    "Raise the starter price",
    "Hire two engineers",
  ]);
  assert.deepEqual(out, ["dollars", "price", "starter"]);
});
