// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { currentLevel, isLevel, planLevelChange, type GrantRow } from "../src/lib/agent-collaboration.ts";

const ROLES = ["owner", "admin", "member"];
const CLASSES = ["meeting_context", "decision_lineage", "action_status"];
const ORDER = ["self", "same_team", "department", "org"];

let n = 0;
function template(level: "same_team" | "department" | "org"): GrantRow[] {
  const rows: GrantRow[] = [];
  for (const target_scope of ORDER.slice(0, ORDER.indexOf(level) + 1)) {
    for (const grantee_role of ROLES) {
      for (const query_class of CLASSES) {
        rows.push({ id: `g${n++}`, grantee_role, query_class, target_scope, effect: "allow" });
      }
    }
  }
  return rows;
}

test("no grants is Off; each template reads as its level", () => {
  assert.equal(currentLevel([]), "off");
  assert.equal(currentLevel(template("same_team")), "same_team");
  assert.equal(currentLevel(template("department")), "department");
  assert.equal(currentLevel(template("org")), "org");
});

test("a deny row, a missing tuple or a hand-made grant reads as custom", () => {
  const withDeny = template("department");
  withDeny[0] = { ...withDeny[0], effect: "deny" };
  assert.equal(currentLevel(withDeny), "custom");
  assert.equal(currentLevel(template("org").slice(1)), "custom");
  assert.equal(
    currentLevel([{ id: "x", grantee_role: "admin", query_class: "action_status", target_scope: "org", effect: "allow" }]),
    "custom",
  );
});

test("Off revokes every grant and adopts nothing", () => {
  const rows = template("org");
  assert.deepEqual(planLevelChange(rows, "off"), { revoke: rows.map((r) => r.id), template: null });
});

test("narrowing revokes the wider grants first, then adopts the narrower template", () => {
  const rows = template("org");
  const plan = planLevelChange(rows, "same_team");
  const kept = rows.filter((r) => !plan.revoke.includes(r.id));
  assert.ok(kept.every((r) => r.target_scope === "self" || r.target_scope === "same_team"));
  assert.equal(plan.revoke.length, 18); // department and org rows: 2 scopes x 3 roles x 3 classes
  assert.equal(plan.template, "same_team");
});

test("widening revokes nothing but deny rows, and adopts the wider template", () => {
  const rows = template("same_team");
  rows[2] = { ...rows[2], effect: "deny" };
  const plan = planLevelChange(rows, "org");
  assert.deepEqual(plan.revoke, [rows[2].id]);
  assert.equal(plan.template, "org");
});

test("only the four levels are accepted", () => {
  for (const ok of ["off", "same_team", "department", "org"]) assert.ok(isLevel(ok));
  for (const bad of ["self", "custom", "", null, 3]) assert.ok(!isLevel(bad));
});
