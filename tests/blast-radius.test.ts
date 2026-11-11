// Run: npm test
// Blast radius (a4 contract, section 3b): the normalizers, the words, the map's geometry and its
// keyboard moves in src/lib/blast-radius.ts.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EFFECT,
  blastRoutes,
  checkedLine,
  chipLine,
  effectPhrase,
  fallbackSummary,
  itemLabel,
  mapCap,
  mapLayout,
  moveFocus,
  normalizeBlast,
  normalizeMeetingBlast,
  safeHref,
} from "../src/lib/blast-radius.ts";

const D = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const item = (over: Record<string, unknown>) => ({
  id: "i",
  kind: "action",
  ring: 1,
  label: "Email the 40 beta customers",
  effect: "changes",
  why: "The beta is now 10 partners",
  href: "/work/tasks?focus=i",
  redacted: false,
  owner: { user_id: "u-raj", name: "Raj Patel" },
  team: null,
  status: "confirmed",
  due: "2026-11-20",
  settlement_id: null,
  ...over,
});

test("always three rings, in order, whatever the server sent", () => {
  const b = normalizeBlast({
    decision_id: D,
    meeting_id: "m",
    content: "Ship to 10 partners",
    state: "ready",
    summary: "Changes 1 task",
    counts: { actions: 1, goals: 0, decisions: 0, customers: 0 },
    rings: [{ ring: 3, label: "Customers", items: [] }, { ring: 1, label: "Work it changes", items: [item({})] }],
    crm: { hubspot: "not_connected" },
  });
  assert.ok(b);
  assert.deepEqual(b.rings.map((r) => r.ring), [1, 2, 3]);
  assert.equal(b.rings[1].label, "Goals and other teams");
  assert.equal(b.rings[0].items[0].ring, 1);
  assert.equal(b.crm.hubspot, "not_connected");
  assert.equal(normalizeBlast(null), null);
});

test("a redacted item carries no label, why, owner or link", () => {
  const b = normalizeBlast({
    decision_id: D,
    rings: [{ ring: 2, items: [item({ kind: "decision", ring: 2, effect: "contradicts", redacted: true, team: "Sales", settlement_id: "s-1" })] }],
  })!;
  const i = b.rings[1].items[0];
  assert.equal(i.label, null);
  assert.equal(i.why, null);
  assert.equal(i.owner, null);
  assert.equal(i.href, null);
  assert.equal(i.settlement_id, "s-1");
  assert.equal(itemLabel(i), "A decision from Sales you were not in");
  assert.equal(itemLabel({ ...i, team: null }), "A decision from another team you were not in");
});

test("only same-site links are followed", () => {
  assert.equal(safeHref("/goals/1"), "/goals/1");
  assert.equal(safeHref("https://evil.example"), null);
  assert.equal(safeHref("//evil.example"), null);
});

test("effects keep the frozen colour language", () => {
  for (const e of ["risks", "contradicts", "blocks"] as const) assert.equal(EFFECT[e].tone, "attention");
  for (const e of ["advances", "unblocks"] as const) assert.equal(EFFECT[e].tone, "ok");
  assert.equal(effectPhrase({ effect: "risks", kind: "goal" }), "Puts this goal at risk");
  assert.equal(effectPhrase({ effect: "contradicts", kind: "decision" }), "May clash with this decision");
});

test("the one-line chip", () => {
  const counts = { actions: 3, goals: 1, decisions: 1, customers: 0 };
  assert.deepEqual(chipLine({ state: "pending", summary: "", counts }), { text: "Working out what this decision touches", quiet: true, pending: true });
  assert.equal(chipLine({ state: "ready", summary: "", counts: { actions: 0, goals: 0, decisions: 0, customers: 0 } }).text, "No ripple found");
  assert.equal(chipLine({ state: "ready", summary: "Changes 3 tasks", counts }).text, "Changes 3 tasks");
  assert.equal(fallbackSummary(counts), "Changes 3 tasks, moves 1 goal and clashes with 1 decision");
  assert.match(checkedLine("connected"), /HubSpot deals\.$/);
  assert.doesNotMatch(checkedLine("not_connected"), /HubSpot/);
});

test("meeting summaries", () => {
  assert.deepEqual(normalizeMeetingBlast({ items: [{ decision_id: D, content: "x", state: "pending", summary: "", counts: {} }, { nope: 1 }] }), [
    { decision_id: D, content: "x", state: "pending", summary: "", counts: { actions: 0, goals: 0, decisions: 0, customers: 0 } },
  ]);
  assert.equal(normalizeMeetingBlast({}), null);
  assert.equal(blastRoutes.meeting("m 1"), "/api/v1/meetings/m%201/blast-radius");
  assert.equal(blastRoutes.decision(D), `/api/v1/decisions/${D}/blast-radius`);
});

test("the map keeps rings concentric and items on their ring, without collisions", () => {
  const L = mapLayout(800, [7, 5, 3]);
  assert.equal(mapCap(800), 7);
  assert.equal(mapCap(620), 5);
  assert.ok(L.radii[0] < L.radii[1] && L.radii[1] < L.radii[2]);
  for (const n of L.nodes) {
    const r = Math.hypot(n.x - L.cx, n.y - L.cy);
    assert.ok(Math.abs(r - L.radii[n.ring - 1]) < 0.5, `node on ring ${n.ring}`);
    assert.ok(n.maxW >= 84 && n.maxW <= 320);
    assert.ok(n.x - 18 + n.maxW <= L.width, "inside the canvas width");
    assert.ok(n.y - 18 >= 0 && n.y + 18 <= L.height, "inside the canvas");
    assert.ok(n.x > L.cx + 22, "clear of the decision");
  }
  // within a ring, nodes are a full row apart
  // pills of one ring end before the next ring's pills start, row by row
  for (const n of L.nodes.filter((m) => m.ring < 3)) {
    const next = L.nodes.find((m) => m.ring === n.ring + 1 && Math.abs(m.y - n.y) < 1);
    if (next) assert.ok(n.x - 18 + n.maxW <= next.x - 18, "no overlap with the next ring");
  }
  const ring1 = L.nodes.filter((n) => n.ring === 1).map((n) => n.y);
  for (let i = 1; i < ring1.length; i++) assert.ok(ring1[i] - ring1[i - 1] >= 44);
});

test("columns follow the labels and shrink alike when crowded", () => {
  const wide = mapLayout(1000, [3, 3, 1], [200, 300, 140]);
  assert.ok(wide.columns[1] > wide.columns[0] && wide.columns[0] > wide.columns[2]);
  const tight = mapLayout(600, [5, 3, 1], [300, 300, 300]);
  assert.ok(tight.radii[2] + tight.columns[2] - 18 <= 600 - 46);
});

test("arrow keys move along and across rings", () => {
  const sizes = { 1: 4, 2: 0, 3: 2 } as const;
  assert.deepEqual(moveFocus("ArrowDown", { ring: 1, index: 3 }, sizes), { ring: 1, index: 0 });
  assert.deepEqual(moveFocus("ArrowUp", { ring: 1, index: 0 }, sizes), { ring: 1, index: 3 });
  assert.deepEqual(moveFocus("End", { ring: 1, index: 0 }, sizes), { ring: 1, index: 3 });
  assert.deepEqual(moveFocus("Home", { ring: 1, index: 2 }, sizes), { ring: 1, index: 0 });
  // ring 2 is empty: Right skips to ring 3, keeping the relative position
  assert.deepEqual(moveFocus("ArrowRight", { ring: 1, index: 3 }, sizes), { ring: 3, index: 1 });
  assert.deepEqual(moveFocus("ArrowLeft", { ring: 3, index: 0 }, sizes), { ring: 1, index: 0 });
  assert.deepEqual(moveFocus("ArrowLeft", { ring: 1, index: 1 }, sizes), { ring: 1, index: 1 });
  assert.equal(moveFocus("a", { ring: 1, index: 0 }, sizes), null);
});
