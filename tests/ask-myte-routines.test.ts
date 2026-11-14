// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { cadenceWords, checkRoutineDraft, nextRunAt, nextRunWords, readyWords, routineThreadTitle, validZone } from "../src/lib/ask-myte/routines.ts";

// Saturday 14 Nov 2026, 10:30 in London (UTC+0 in November).
const NOW = new Date("2026-11-14T10:30:00Z");

test("words for a cadence", () => {
  assert.equal(cadenceWords({ cadence: "weekly", weekday: 0, hour: 9 }), "Every Monday at 09:00");
  assert.equal(cadenceWords({ cadence: "weekdays", weekday: null, hour: 8 }), "Every weekday at 08:00");
  assert.equal(cadenceWords({ cadence: "daily", weekday: null, hour: 18 }), "Every day at 18:00");
  assert.equal(readyWords({ cadence: "weekly", weekday: 0 }), "Your Monday update is ready");
});

test("the form's rules", () => {
  const base = { question: "  what changed in   pricing? ", cadence: "weekly" as const, weekday: 0, hour: 9, timezone: "Europe/London" };
  const ok = checkRoutineDraft(base);
  assert.ok(ok.ok);
  if (ok.ok) assert.equal(ok.value.question, "what changed in pricing?");
  assert.equal(checkRoutineDraft({ ...base, question: " " }).ok, false);
  assert.equal(checkRoutineDraft({ ...base, weekday: null }).ok, false);
  assert.equal(checkRoutineDraft({ ...base, hour: 24 }).ok, false);
  assert.equal(checkRoutineDraft({ ...base, timezone: "Mars/Olympus" }).ok, false);
  const daily = checkRoutineDraft({ ...base, cadence: "daily", weekday: 3 });
  assert.ok(daily.ok && daily.value.weekday === null);
  assert.ok(validZone("Asia/Kolkata"));
});

test("next run: weekly, weekdays, daily, across zones", () => {
  // Weekly Monday 09:00 London: Monday 16 Nov 09:00 UTC.
  assert.equal(nextRunAt({ cadence: "weekly", weekday: 0, hour: 9, timezone: "Europe/London" }, NOW)?.toISOString(), "2026-11-16T09:00:00.000Z");
  // Weekdays 08:00: Saturday and Sunday skip, so Monday.
  assert.equal(nextRunAt({ cadence: "weekdays", weekday: null, hour: 8, timezone: "Europe/London" }, NOW)?.toISOString(), "2026-11-16T08:00:00.000Z");
  // Daily 18:00 later today.
  assert.equal(nextRunAt({ cadence: "daily", weekday: null, hour: 18, timezone: "Europe/London" }, NOW)?.toISOString(), "2026-11-14T18:00:00.000Z");
  // Kolkata is UTC+5:30: it is already 16:00 there, so 18:00 Kolkata is 12:30 UTC.
  assert.equal(nextRunAt({ cadence: "daily", weekday: null, hour: 18, timezone: "Asia/Kolkata" }, NOW)?.toISOString(), "2026-11-14T12:30:00.000Z");
  // Saturday weekly at 09:00 has passed today: next Saturday.
  assert.equal(nextRunAt({ cadence: "weekly", weekday: 5, hour: 9, timezone: "Europe/London" }, NOW)?.toISOString(), "2026-11-21T09:00:00.000Z");
  assert.equal(nextRunWords({ cadence: "weekly", weekday: 0, hour: 9, timezone: "Europe/London" }, NOW), "Monday 16 Nov at 09:00");
  assert.equal(nextRunAt({ cadence: "daily", weekday: null, hour: 9, timezone: "nope" }, NOW), null);
});

test("next run across a DST change (New York, 2 Nov 2026 falls back)", () => {
  const sat = new Date("2026-10-31T20:00:00Z");
  // Sunday 1 Nov 09:00 in New York is EST (UTC-5) after the 02:00 change.
  assert.equal(nextRunAt({ cadence: "daily", weekday: null, hour: 9, timezone: "America/New_York" }, new Date("2026-11-01T05:00:00Z"))?.toISOString(), "2026-11-01T14:00:00.000Z");
  assert.ok(nextRunAt({ cadence: "daily", weekday: null, hour: 9, timezone: "America/New_York" }, sat));
});

test("a run's thread title", () => {
  assert.equal(routineThreadTitle({ question: "What changed in pricing?", cadence: "weekly", weekday: 0 }), "Monday update: What changed in pricing?");
  assert.ok(routineThreadTitle({ question: "x ".repeat(200), cadence: "daily", weekday: null }).length <= 120);
});
