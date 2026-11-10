// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BRAIN_LIMITS,
  agendaMinutes,
  asItems,
  cleanTopics,
  currentQuarter,
  deriveReadiness,
  fieldFromDetail,
  filterTerms,
  isOrgProfileEmpty,
  kindCounts,
  looksLikeAcronym,
  moveItem,
  normalizeGoal,
  normalizeReadiness,
  normalizeTemplate,
  normalizeTerm,
  normalizeWelcome,
  parseGlossaryImport,
  readingMinutes,
  reorderPatches,
  sortGoals,
  splitNewAndExisting,
  validateGoal,
  validateGroundRules,
  validateOrgProfile,
  validateOwner,
  validateTemplate,
  validateTerm,
  welcomeDaysLeft,
  EMPTY_PROFILE,
  type GlossaryTerm,
  type OrgGoal,
} from "../src/lib/api/org-brain-types.ts";

const term = (over: Partial<GlossaryTerm> = {}): GlossaryTerm => ({
  id: "t1",
  term: "Nimbus",
  kind: "codename",
  definition: "The billing rewrite",
  aliases: ["NMB"],
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  ...over,
});

const goal = (over: Partial<OrgGoal> = {}): OrgGoal => ({
  id: "g1",
  title: "Ship Nimbus",
  description: null,
  period: "2026-Q4",
  status: "active",
  owner_user_id: null,
  position: 0,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  ...over,
});

/* ---------------- paste a list ---------------- */

test("import: one term per line, with and without a definition", () => {
  const r = parseGlossaryImport("Nimbus: the billing rewrite\nHalo\n\n  Acme Corp : our biggest customer  ");
  assert.deepEqual(
    r.rows.map((x) => [x.line, x.term, x.definition]),
    [
      [1, "Nimbus", "the billing rewrite"],
      [2, "Halo", null],
      [4, "Acme Corp", "our biggest customer"],
    ],
  );
  assert.equal(r.problems.length, 0);
});

test("import: tabs and spaced dashes separate too; the earliest separator wins", () => {
  const r = parseGlossaryImport("Pricing\tthe plan grid\nARR - annual recurring revenue\nSLA: 99.9% - monthly");
  assert.deepEqual(
    r.rows.map((x) => [x.term, x.definition]),
    [
      ["Pricing", "the plan grid"],
      ["ARR", "annual recurring revenue"],
      ["SLA", "99.9% - monthly"],
    ],
  );
});

test("import: a hyphen inside a word is not a separator", () => {
  const r = parseGlossaryImport("Self-serve\nE-sign: signing contracts online");
  assert.deepEqual(
    r.rows.map((x) => [x.term, x.definition]),
    [
      ["Self-serve", null],
      ["E-sign", "signing contracts online"],
    ],
  );
});

test("import: bullets and numbering are stripped", () => {
  const r = parseGlossaryImport("- Nimbus: rewrite\n* Halo\n• Orbit\n1. Atlas\n2) Vega: a star");
  assert.deepEqual(
    r.rows.map((x) => x.term),
    ["Nimbus", "Halo", "Orbit", "Atlas", "Vega"],
  );
});

test("import: brackets are aliases with a definition, the definition without one", () => {
  const r = parseGlossaryImport("Nimbus (NMB, Project N): the billing rewrite\nARR (annual recurring revenue)");
  assert.deepEqual(r.rows[0].aliases, ["NMB", "Project N"]);
  assert.equal(r.rows[0].definition, "the billing rewrite");
  assert.equal(r.rows[1].term, "ARR");
  assert.equal(r.rows[1].definition, "annual recurring revenue");
  assert.deepEqual(r.rows[1].aliases, []);
});

test("import: an alias equal to the term is dropped", () => {
  const r = parseGlossaryImport("Nimbus (nimbus, NMB): rewrite");
  assert.deepEqual(r.rows[0].aliases, ["NMB"]);
});

test("import: acronyms are detected, everything else takes the default kind", () => {
  const r = parseGlossaryImport("ARR\nSOC2\nP&L\nNimbus\nA\nOK", { defaultKind: "product" });
  assert.deepEqual(
    r.rows.map((x) => [x.term, x.kind]),
    [
      ["ARR", "acronym"],
      ["SOC2", "acronym"],
      ["P&L", "acronym"],
      ["Nimbus", "product"],
      ["A", "product"],
      ["OK", "acronym"],
    ],
  );
  const off = parseGlossaryImport("ARR", { detectAcronyms: false });
  assert.equal(off.rows[0].kind, "other");
});

test("import: repeated terms keep the first line, ignoring case", () => {
  const r = parseGlossaryImport("Nimbus: first\nnimbus: second\nNIMBUS");
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].definition, "first");
  assert.equal(r.repeated, 2);
});

test("import: lines over a limit are problems, never trimmed", () => {
  const long = "x".repeat(BRAIN_LIMITS.glossary.term + 1);
  const longDef = "y".repeat(BRAIN_LIMITS.glossary.definition + 1);
  const r = parseGlossaryImport(`${long}\nGood: ok\n: no term\nTerm: ${longDef}`);
  assert.deepEqual(
    r.rows.map((x) => x.term),
    ["Good"],
  );
  assert.deepEqual(
    r.problems.map((p) => p.line),
    [1, 3, 4],
  );
  assert.match(r.problems[1].reason, /no term/);
});

test("import: rows past the import limit are counted, not included", () => {
  const text = Array.from({ length: 205 }, (_, i) => `Term ${i}`).join("\n");
  const r = parseGlossaryImport(text);
  assert.equal(r.rows.length, BRAIN_LIMITS.glossary.importMax);
  assert.equal(r.overLimit, 5);
});

test("import: windows line endings and blank input", () => {
  assert.equal(parseGlossaryImport("A1: x\r\nB2: y\r\n").rows.length, 2);
  const empty = parseGlossaryImport("   \n\n");
  assert.equal(empty.rows.length, 0);
  assert.equal(empty.problems.length, 0);
});

test("splitNewAndExisting: upsert by term, ignoring case", () => {
  const { added, updated } = splitNewAndExisting([{ term: "nimbus" }, { term: "Halo" }], [term()]);
  assert.deepEqual(
    added.map((x) => x.term),
    ["Halo"],
  );
  assert.deepEqual(
    updated.map((x) => x.term),
    ["nimbus"],
  );
});

test("looksLikeAcronym", () => {
  assert.equal(looksLikeAcronym("API"), true);
  assert.equal(looksLikeAcronym("Api"), false);
  assert.equal(looksLikeAcronym("A"), false);
  assert.equal(looksLikeAcronym("ABCDEFGHIJK"), false);
});

/* ---------------- validation ---------------- */

test("validateTerm: cleans, defaults and catches duplicates", () => {
  const ok = validateTerm({ term: "  Halo  ", kind: "product", definition: "  ", aliases: ["halo", " HL ", "HL"] }, [term()]);
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value, { term: "Halo", kind: "product", definition: null, aliases: ["HL"] });

  const dup = validateTerm({ term: "nimbus", kind: "product", definition: "", aliases: [] }, [term()]);
  assert.ok(!dup.ok);
  if (!dup.ok) assert.match(dup.errors.term ?? "", /already/);

  const self = validateTerm({ term: "nimbus", kind: "product", definition: "", aliases: [] }, [term()], "t1");
  assert.ok(self.ok);
});

test("validateTerm: limits and kind", () => {
  const r = validateTerm({
    term: "",
    kind: "planet",
    definition: "d".repeat(301),
    aliases: Array.from({ length: 11 }, (_, i) => `a${i}`),
  });
  assert.ok(!r.ok);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["aliases", "definition", "kind", "term"]);
});

test("validateOrgProfile: trims, dedupes and enforces limits", () => {
  const ok = validateOrgProfile({ description: " We build Nimbus. ", industry: " Fintech ", products: ["Nimbus", "nimbus", ""], customers: [] });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value, { description: "We build Nimbus.", industry: "Fintech", products: ["Nimbus"], customers: [] });

  const bad = validateOrgProfile({
    description: "x".repeat(2001),
    industry: "i".repeat(101),
    products: Array.from({ length: 31 }, (_, i) => `p${i}`),
    customers: ["c".repeat(81)],
  });
  assert.ok(!bad.ok);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ["customers", "description", "industry", "products"]);
});

test("validateOwner: topic and person required, one owner per topic", () => {
  const existing = [{ id: "o1", topic: "Pricing" }];
  assert.ok(validateOwner({ topic: "Hiring", owner_user_id: "u1" }, existing).ok);
  const dup = validateOwner({ topic: " pricing ", owner_user_id: "u1" }, existing);
  assert.ok(!dup.ok);
  assert.ok(validateOwner({ topic: "pricing", owner_user_id: "u2" }, existing, "o1").ok);
  const empty = validateOwner({ topic: "", owner_user_id: "" });
  assert.ok(!empty.ok);
  if (!empty.ok) assert.deepEqual(Object.keys(empty.errors).sort(), ["owner_user_id", "topic"]);
});

test("validateGoal: title required, active cap of 30", () => {
  const ok = validateGoal({ title: " Ship Nimbus ", description: "", period: " 2026-Q4 ", status: "active", owner_user_id: "" });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value, { title: "Ship Nimbus", description: null, period: "2026-Q4", status: "active", owner_user_id: null });

  const capped = validateGoal({ title: "One more", description: "", period: "", status: "active", owner_user_id: null }, 30);
  assert.ok(!capped.ok);
  assert.ok(validateGoal({ title: "Done one", description: "", period: "", status: "achieved", owner_user_id: null }, 30).ok);

  const bad = validateGoal({ title: "", description: "", period: "x".repeat(21), status: "maybe", owner_user_id: null });
  assert.ok(!bad.ok);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ["period", "status", "title"]);
});

test("validateGroundRules: dedupes and caps", () => {
  const ok = validateGroundRules(["Salaries", "salaries", " Layoffs "]);
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value.never_record_topics, ["Salaries", "Layoffs"]);
  assert.ok(!validateGroundRules(Array.from({ length: 31 }, (_, i) => `t${i}`)).ok);
  assert.ok(!validateGroundRules(["x".repeat(81)]).ok);
});

test("validateTemplate: length range, agenda rows, empty rows dropped", () => {
  const ok = validateTemplate({
    name: " Weekly sync ",
    description: "",
    default_duration_minutes: "30",
    agenda: [
      { title: "Wins", duration_minutes: "5" },
      { title: "", duration_minutes: "" },
      { title: "Blockers", duration_minutes: null },
    ],
    confidential: false,
  });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.value.name, "Weekly sync");
    assert.equal(ok.value.default_duration_minutes, 30);
    assert.deepEqual(ok.value.agenda, [
      { title: "Wins", duration_minutes: 5 },
      { title: "Blockers", duration_minutes: null },
    ]);
  }
  const bad = validateTemplate({ name: "", description: "", default_duration_minutes: 4, agenda: [{ title: "", duration_minutes: 5 }], confidential: true });
  assert.ok(!bad.ok);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ["agenda", "default_duration_minutes", "name"]);
  assert.ok(!validateTemplate({ name: "Long", description: "", default_duration_minutes: 481, agenda: [], confidential: false }).ok);
  assert.ok(
    !validateTemplate(
      { name: "weekly SYNC", description: "", default_duration_minutes: 30, agenda: [], confidential: false },
      [{ id: "m1", name: "Weekly sync" }],
    ).ok,
  );
});

test("agendaMinutes sums what has minutes", () => {
  assert.equal(agendaMinutes([{ title: "a", duration_minutes: 5 }, { title: "b", duration_minutes: null }, { title: "c", duration_minutes: 10 }]), 15);
});

test("fieldFromDetail matches whole field names", () => {
  assert.equal(fieldFromDetail("definition: too long", ["term", "definition"]), "definition");
  assert.equal(fieldFromDetail("body.owner_user_id is not a member", ["topic", "owner_user_id"]), "owner_user_id");
  assert.equal(fieldFromDetail("terms limit reached", ["term"]), null);
});

test("cleanTopics squashes whitespace and dedupes", () => {
  assert.deepEqual(cleanTopics(["  a  b ", "A B", "", "c"]), ["a b", "c"]);
});

/* ---------------- lists ---------------- */

test("filterTerms searches term, aliases and definition within a kind", () => {
  const terms = [term(), term({ id: "t2", term: "Acme", kind: "customer", definition: "Biggest account", aliases: [] })];
  assert.equal(filterTerms(terms, "nmb", null).length, 1);
  assert.equal(filterTerms(terms, "account", null)[0].id, "t2");
  assert.equal(filterTerms(terms, "", "customer").length, 1);
  assert.equal(filterTerms(terms, "nimbus", "customer").length, 0);
  assert.equal(kindCounts(terms).codename, 1);
  assert.equal(kindCounts(terms).customer, 1);
});

test("moveItem and reorderPatches", () => {
  const goals = [goal({ id: "a", position: 0 }), goal({ id: "b", position: 1 }), goal({ id: "c", position: 2 })];
  const moved = moveItem(goals, 2, 0);
  assert.deepEqual(
    moved.map((g) => g.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(reorderPatches(moved), [
    { id: "c", position: 0 },
    { id: "a", position: 1 },
    { id: "b", position: 2 },
  ]);
  assert.deepEqual(moveItem(goals, 0, 5), goals);
  assert.deepEqual(reorderPatches(goals), []);
});

test("sortGoals orders by position then age", () => {
  const out = sortGoals([goal({ id: "b", position: 1 }), goal({ id: "a", position: 0 }), goal({ id: "z", position: 0, created_at: "2026-12-01" })]);
  assert.deepEqual(
    out.map((g) => g.id),
    ["a", "z", "b"],
  );
});

/* ---------------- normalizers ---------------- */

test("normalizers tolerate missing fields and envelopes", () => {
  assert.deepEqual(asItems({ items: [1] }), [1]);
  assert.deepEqual(asItems([2]), [2]);
  assert.deepEqual(asItems(null), []);
  assert.equal(normalizeTerm({ id: "x" }), null);
  assert.equal(normalizeTerm({ id: "x", term: "T", kind: "planet" })?.kind, "other");
  assert.equal(normalizeGoal({ id: "g", title: "T", status: "weird" })?.status, "active");
  const t = normalizeTemplate({ id: "m", name: "Sync", agenda: [{ title: "A", duration_minutes: 5 }, { nope: 1 }] });
  assert.equal(t?.agenda.length, 1);
  assert.equal(t?.default_duration_minutes, 30);
  assert.equal(t?.confidential, false);
  const w = normalizeWelcome({ goals: [{ id: "g2", title: "B", position: 1 }, { id: "g1", title: "A", position: 0 }], team: [{ user_id: "u" }, {}] });
  assert.deepEqual(
    w.goals.map((g) => g.id),
    ["g1", "g2"],
  );
  assert.equal(w.team.length, 1);
  assert.deepEqual(w.profile, EMPTY_PROFILE);
});

/* ---------------- readiness ---------------- */

test("deriveReadiness follows the A7 thresholds with equal weights", () => {
  const none = deriveReadiness({ descriptionLength: 39, terms: 9, owners: 4, activeGoals: 0, groundRulesSet: false, membersWithoutRole: null });
  assert.equal(none.score, 0);
  assert.equal(none.checks.length, 6);
  const all = deriveReadiness({ descriptionLength: 40, terms: 10, owners: 5, activeGoals: 1, groundRulesSet: true, membersWithoutRole: 0 });
  assert.equal(all.score, 100);
  const half = deriveReadiness({ descriptionLength: 400, terms: 12, owners: 1, activeGoals: 2, groundRulesSet: false, membersWithoutRole: 3 });
  assert.equal(half.score, 50);
  assert.match(half.checks.find((c) => c.key === "roles")?.detail ?? "", /3 members/);
});

test("normalizeReadiness orders checks and clamps the score", () => {
  const r = normalizeReadiness({
    score: 140,
    checks: [
      { key: "roles", label: "Roles", done: false, detail: "2 without a role" },
      { key: "profile", done: true },
      { key: "mystery", done: true },
    ],
  });
  assert.equal(r.score, 100);
  assert.deepEqual(
    r.checks.map((c) => c.key),
    ["profile", "roles", "mystery"],
  );
  assert.equal(r.checks[0].label, "About the company");
});

/* ---------------- first run and welcome ---------------- */

test("isOrgProfileEmpty", () => {
  assert.equal(isOrgProfileEmpty(null), true);
  assert.equal(isOrgProfileEmpty(EMPTY_PROFILE), true);
  assert.equal(isOrgProfileEmpty({ ...EMPTY_PROFILE, description: "  " }), true);
  assert.equal(isOrgProfileEmpty({ ...EMPTY_PROFILE, products: ["Nimbus"] }), false);
});

test("welcomeDaysLeft counts 14 days from joining", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  assert.equal(welcomeDaysLeft("2026-11-10T08:00:00Z", now), 14);
  assert.equal(welcomeDaysLeft("2026-11-01T12:00:00Z", now), 5);
  assert.equal(welcomeDaysLeft("2026-10-27T11:00:00Z", now), null);
  assert.equal(welcomeDaysLeft("", now), null);
  assert.equal(welcomeDaysLeft("not a date", now), null);
  assert.equal(welcomeDaysLeft("2026-12-01T00:00:00Z", now), 14);
});

test("currentQuarter and readingMinutes", () => {
  assert.equal(currentQuarter(new Date(2026, 10, 10)), "2026-Q4");
  assert.equal(currentQuarter(new Date(2026, 0, 1)), "2026-Q1");
  assert.equal(readingMinutes(""), 1);
  assert.equal(readingMinutes(Array.from({ length: 460 }, () => "w").join(" ")), 2);
});
