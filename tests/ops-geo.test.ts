// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { memberPlaces } from "../src/lib/ops-geo.ts";

test("members are placed by the time zone they saved, grouped by country", () => {
  const r = memberPlaces(
    [
      { time_zone: "Asia/Kolkata", members: 3 },
      // An older name some browsers still report: the same place.
      { time_zone: "Asia/Calcutta", members: 1 },
      { time_zone: "Europe/Berlin", members: 2 },
    ],
    6,
  );
  assert.deepEqual(
    r.places.map((p) => [p.key, p.count]),
    [
      ["IN", 4],
      ["DE", 2],
    ],
  );
  const india = r.places[0];
  assert.equal(india.label, "India");
  // Kolkata, from the IANA zone table: India is never drawn in the United States.
  assert.ok(india.lat > 20 && india.lat < 25 && india.lon > 85 && india.lon < 90);
  assert.equal(r.notSet, 0);
});

test("UTC, unknown zones and members with no saved preferences are not set, never guessed", () => {
  const r = memberPlaces(
    [
      { time_zone: "UTC", members: 2 },
      { time_zone: "Mars/Olympus_Mons", members: 1 },
      { time_zone: "Asia/Kolkata", members: 1 },
    ],
    // Six members in all: two have no listening preferences row.
    6,
  );
  assert.deepEqual(
    r.places.map((p) => p.key),
    ["IN"],
  );
  assert.equal(r.placed, 1);
  assert.equal(r.notSet, 5);
});

test("members are placed by the country and state they set, states largest first", async () => {
  const { placesFromCountries } = await import("../src/lib/ops-geo.ts");
  const r = placesFromCountries(
    [
      { country: "IN", subdivision: "IN-KA", members: 5 },
      { country: "IN", subdivision: "IN-MH", members: 2 },
      { country: "IN", subdivision: null, members: 1 },
      { country: "US", subdivision: "US-CA", members: 1 },
      { country: null, subdivision: null, members: 3 },
    ],
    [{ time_zone: "Asia/Calcutta", members: 8 }],
    13,
  );
  assert.deepEqual(
    r.places.map((p) => [p.key, p.count]),
    [
      ["IN", 8],
      ["US", 1],
    ],
  );
  assert.deepEqual(r.places[0].states, [
    { name: "Karnataka", count: 5 },
    { name: "Maharashtra", count: 2 },
  ]);
  // India sits at Kolkata (its members' saved zone); the US, with no zone saved, in the middle
  // of its zones: inside the country, never off its coast.
  assert.ok(r.places[0].lat > 20 && r.places[0].lon > 85);
  const us = r.places[1];
  assert.ok(us.lat > 25 && us.lat < 50 && us.lon > -125 && us.lon < -67, `${us.lat},${us.lon}`);
  // Three said nothing, and one member is not counted at all.
  assert.equal(r.notSet, 4);
});
