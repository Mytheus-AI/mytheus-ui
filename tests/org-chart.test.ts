// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildOrgChart, descendantsOf, NO_DEPARTMENT, planRosterChanges } from "../src/lib/org-chart.ts";

const person = (id: string, name: string, isYou = false) => ({
  id,
  name,
  email: `${name.toLowerCase()}@example.com`,
  imageUrl: null,
  isYou,
});

const people = [person("u1", "Asha", true), person("u2", "Bilal"), person("u3", "Chen"), person("u4", "Dev")];

test("an empty workspace has no departments and everyone unassigned", () => {
  const chart = buildOrgChart([], [], [], people);
  assert.deepEqual(chart.departments, []);
  assert.equal(chart.teamCount, 0);
  assert.equal(chart.peopleOnTeams, 0);
  assert.equal(chart.unassigned.length, 4);
});

test("teams group under their department, leads first, names from the member list", () => {
  const chart = buildOrgChart(
    [{ id: "d1", name: "Engineering", parent_id: null }],
    [{ id: "t1", name: "Platform", department_id: "d1" }],
    [
      { team_id: "t1", user_id: "u3", role: "member" },
      { team_id: "t1", user_id: "u2", role: "Lead" },
    ],
    people,
  );
  assert.equal(chart.departments.length, 1);
  const [team] = chart.departments[0].teams;
  assert.deepEqual(
    team.members.map((m) => [m.name, m.lead]),
    [
      ["Bilal", true],
      ["Chen", false],
    ],
  );
  assert.equal(chart.peopleOnTeams, 2);
  assert.deepEqual(chart.unassigned.map((p) => p.id), ["u1", "u4"]);
});

test("teams with no (or a deleted) department land in one trailing group", () => {
  const chart = buildOrgChart(
    [{ id: "d1", name: "Sales", parent_id: null }],
    [
      { id: "t1", name: "Solo", department_id: null },
      { id: "t2", name: "Orphan", department_id: "gone" },
    ],
    [],
    people,
  );
  const last = chart.departments.at(-1)!;
  assert.equal(last.id, null);
  assert.equal(last.name, NO_DEPARTMENT);
  assert.deepEqual(last.teams.map((t) => t.name), ["Orphan", "Solo"]);
  assert.deepEqual(chart.departments[0].teams, []);
});

test("nested departments follow their parent and carry its name", () => {
  const chart = buildOrgChart(
    [
      { id: "c", name: "Backend", parent_id: "p" },
      { id: "z", name: "Admin", parent_id: null },
      { id: "p", name: "Engineering", parent_id: null },
    ],
    [],
    [],
    people,
  );
  assert.deepEqual(
    chart.departments.map((d) => [d.name, d.parentName]),
    [
      ["Admin", null],
      ["Engineering", null],
      ["Backend", "Engineering"],
    ],
  );
});

test("a department cycle still shows every department once", () => {
  const chart = buildOrgChart(
    [
      { id: "a", name: "A", parent_id: "b" },
      { id: "b", name: "B", parent_id: "a" },
    ],
    [],
    [],
    people,
  );
  assert.deepEqual(chart.departments.map((d) => d.name).sort(), ["A", "B"]);
});

test("roster rows for people no longer in the workspace are dropped", () => {
  const chart = buildOrgChart(
    [],
    [{ id: "t1", name: "Ops", department_id: null }],
    [{ team_id: "t1", user_id: "someone-who-left", role: "lead" }],
    people,
  );
  assert.deepEqual(chart.departments[0].teams[0].members, []);
  assert.equal(chart.peopleOnTeams, 0);
});

test("roster plan: adds, removes and moves the lead without touching others", () => {
  const changes = planRosterChanges(
    [
      { user_id: "u1", role: "lead" },
      { user_id: "u2", role: "designer" },
      { user_id: "u3", role: "member" },
    ],
    ["u1", "u2", "u4"],
    "u4",
  );
  assert.deepEqual(changes, [
    { kind: "put", userId: "u1", role: "member" },
    { kind: "put", userId: "u4", role: "lead" },
    { kind: "delete", userId: "u3" },
  ]);
});

test("roster plan: nothing to send when nothing changed", () => {
  assert.deepEqual(
    planRosterChanges(
      [
        { user_id: "u1", role: "lead" },
        { user_id: "u2", role: "member" },
      ],
      ["u2", "u1"],
      "u1",
    ),
    [],
  );
});

test("roster plan: a lead outside the selection is ignored", () => {
  assert.deepEqual(planRosterChanges([], ["u1"], "u9"), [{ kind: "put", userId: "u1", role: "member" }]);
});

test("descriptions come through trimmed, blank reads as none, depth follows nesting", () => {
  const chart = buildOrgChart(
    [
      { id: "d1", name: "Engineering", parent_id: null, description: "  Builds the product.  " },
      { id: "d2", name: "Security", parent_id: "d1", description: "   " },
    ],
    [
      { id: "t1", name: "Platform", department_id: "d1", description: "Owns deploys." },
      { id: "t2", name: "Loose", department_id: null },
    ],
    [],
    people,
  );
  const [eng, sec, none] = chart.departments;
  assert.equal(eng.description, "Builds the product.");
  assert.equal(eng.depth, 0);
  assert.equal(sec.description, null);
  assert.equal(sec.depth, 1);
  assert.equal(sec.parentId, "d1");
  assert.equal(eng.teams[0].description, "Owns deploys.");
  assert.equal(none.id, null);
  assert.equal(none.teams[0].description, null);
});

test("descendantsOf finds every department below one, and survives a loop", () => {
  const deps = [
    { id: "a", parent_id: null },
    { id: "b", parent_id: "a" },
    { id: "c", parent_id: "b" },
    { id: "d", parent_id: null },
    { id: "x", parent_id: "y" },
    { id: "y", parent_id: "x" },
  ];
  assert.deepEqual([...descendantsOf(deps, "a")].sort(), ["b", "c"]);
  assert.deepEqual([...descendantsOf(deps, "d")], []);
  assert.deepEqual([...descendantsOf(deps, "x")], ["y"]);
});
