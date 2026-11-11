// Run: npm test
// "Decisions that know why" (a4 contract, section 3): the normalizer, the request table, the words
// and the owner's edit checks in src/lib/decision-why.ts.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EMPTY_DRAFT,
  brokenTitle,
  checkDraft,
  checkNote,
  decisionSubject,
  draftOf,
  evidenceSource,
  focusIdOf,
  normalizeWhy,
  orderAssumptions,
  resolutionLine,
  sourcesLine,
  watchParts,
  watchState,
  whyRoutes,
} from "../src/lib/decision-why.ts";

const D = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const A = "11111111-2222-4333-8444-555555555555";
const M = "22222222-3333-4444-8555-666666666666";

const evidence = (over: Record<string, unknown> = {}) => ({
  id: "e-1",
  source: "meeting",
  quote: "Acme told us the new price is 52,000.",
  redacted: false,
  speaker: { user_id: "u-raj", name: "Raj Patel" },
  source_meeting: { id: M, title: "Vendor sync", date: "2026-11-10T10:00:00Z" },
  source_decision_id: null,
  source_ref: null,
  source_url: null,
  rationale: "The quote is now above the 40,000 the decision assumed.",
  confidence: 0.86,
  status: "open",
  created_at: "2026-11-10T11:00:00Z",
  resolved_at: null,
  resolved_by: null,
  resolution_note: null,
  revisit_meeting_id: null,
  ...over,
});

const WIRE = {
  decision_id: D,
  meeting_id: M,
  content: "Go with Acme as our SSO vendor",
  owner: { user_id: "u-sarah", name: "Sarah Okafor" },
  can_edit: true,
  state: "ready",
  reopened: null,
  assumptions: [
    {
      id: "a-2",
      decision_id: D,
      kind: "date",
      statement: "Acme ships SAML by December 1",
      quote: null,
      stated_by: null,
      source: "agent",
      status: "watching",
      watch: { date: "2026-12-01", value: null, comparator: null, unit: null, jira_key: "SSO-142", deal_id: null },
      reconfirmed_at: null,
      reconfirm_note: null,
      last_checked_at: null,
      created_at: "2026-11-02T10:00:00Z",
      open_break: null,
      history: [],
    },
    {
      id: A,
      decision_id: D,
      kind: "price",
      statement: "Acme's quote stays under $40,000 a year",
      quote: "If they hold the price at forty, we sign this quarter.",
      stated_by: { user_id: "u-maya", name: "Maya Chen" },
      source: "agent",
      status: "broken",
      watch: { date: null, value: 40000, comparator: "lt", unit: "USD", jira_key: null, deal_id: null },
      reconfirmed_at: null,
      reconfirm_note: null,
      last_checked_at: "2026-11-10T12:00:00Z",
      created_at: "2026-11-03T10:00:00Z",
      open_break: evidence(),
      history: [evidence({ id: "e-0", status: "reconfirmed", resolved_by: { user_id: "u-sarah", name: "Sarah Okafor" }, resolved_at: "2026-11-05T10:00:00Z", resolution_note: "Still the best option" })],
    },
  ],
  sources: { transcripts: "connected", jira: "connected", linear: "not_connected", hubspot: "not_connected", checked_at: "2026-11-11T06:00:00Z" },
};

test("normalizes the contract's DecisionWhy", () => {
  const w = normalizeWhy(WIRE);
  assert.ok(w);
  assert.equal(w.assumptions.length, 2);
  assert.equal(w.assumptions[1].status, "broken");
  assert.equal(w.assumptions[1].open_break?.speaker?.name, "Raj Patel");
  assert.equal(w.assumptions[1].history.length, 1);
  assert.equal(w.sources.hubspot, "not_connected");
  assert.equal(normalizeWhy(null), null);
  assert.equal(normalizeWhy({}), null);
});

test("redacted evidence never carries words, a speaker or a meeting title", () => {
  const w = normalizeWhy({
    ...WIRE,
    assumptions: [{ ...WIRE.assumptions[1], open_break: evidence({ redacted: true, quote: "leaked", speaker: { user_id: "x", name: "X" } }) }],
  });
  const e = w?.assumptions[0].open_break;
  assert.ok(e);
  assert.equal(e.quote, null);
  assert.equal(e.speaker, null);
  assert.equal(e.source_meeting?.title, null);
  assert.equal(evidenceSource(e).text, "Said in a meeting you were not in");
  assert.equal(evidenceSource(e).href, null);
});

test("a broken status without its evidence is read as watching", () => {
  const w = normalizeWhy({ ...WIRE, assumptions: [{ ...WIRE.assumptions[1], open_break: null }] });
  assert.equal(w?.assumptions[0].status, "watching");
});

test("unknown kinds and states fall back safely", () => {
  const w = normalizeWhy({ ...WIRE, state: "weird", assumptions: [{ ...WIRE.assumptions[0], kind: "vibes" }], sources: {} });
  assert.equal(w?.state, "ready");
  assert.equal(w?.assumptions[0].kind, "other");
  assert.equal(w?.sources.jira, "unknown");
  assert.equal(w?.sources.linear, "not_connected");
});

test("broken reasons come first", () => {
  const w = normalizeWhy(WIRE)!;
  assert.deepEqual(orderAssumptions(w.assumptions).map((a) => a.id), [A, "a-2"]);
});

test("watch parts and state read plainly", () => {
  const w = normalizeWhy(WIRE)!;
  assert.deepEqual(watchParts(w.assumptions[1].watch).map((p) => p.text), ["Below $40,000"]);
  assert.deepEqual(watchParts(w.assumptions[0].watch).map((p) => p.text), ["By Dec 1, 2026", "Jira SSO-142"]);
  assert.deepEqual(watchState(w.assumptions[1]), { label: "No longer true", tone: "medium" });
  assert.equal(watchState(w.assumptions[0]).label, "Watching");
  assert.equal(watchState({ ...w.assumptions[0], reconfirmed_at: "2026-11-05T10:00:00Z" }).label, "Re-confirmed Nov 5, 2026");
});

test("the hero title names the decision's topic when it can", () => {
  assert.equal(decisionSubject("Go with Acme as our SSO vendor"), "vendor");
  assert.equal(brokenTitle("Go with Acme as our SSO vendor"), "A reason for your vendor decision is no longer true");
  assert.equal(decisionSubject("Ship on Dec 2"), "“Ship on Dec 2”");
  assert.equal(brokenTitle("We will move the data warehouse to a managed service next quarter"), "A reason for your decision is no longer true");
});

test("the evidence source line, by source", () => {
  const w = normalizeWhy(WIRE)!;
  const e = w.assumptions[1].open_break!;
  assert.deepEqual(evidenceSource(e), { text: "Said in Vendor sync, Nov 10, 2026", href: `/meetings/${M}`, external: false });
  assert.deepEqual(evidenceSource({ ...e, source: "jira", source_ref: "SSO-142", source_url: "https://acme.atlassian.net/browse/SSO-142" }), {
    text: "Jira SSO-142",
    href: "https://acme.atlassian.net/browse/SSO-142",
    external: true,
  });
  assert.equal(evidenceSource({ ...e, source: "decision", source_decision_id: D }).href, `/meetings/${M}/decisions/${D}`);
  assert.equal(resolutionLine(w.assumptions[1].history[0]), "Sarah Okafor re-confirmed it on Nov 5, 2026: “Still the best option”");
});

test("the sources line is honest", () => {
  assert.deepEqual(
    sourcesLine(normalizeWhy(WIRE)!.sources).map((s) => s.label),
    ["Transcripts watched", "Jira connected", "Linear not connected", "HubSpot not connected"],
  );
});

test("requests match the contract", () => {
  assert.deepEqual(whyRoutes.why(D), { method: "GET", path: `/api/v1/decisions/${D}/why` });
  assert.equal(whyRoutes.add(D, { kind: "price", statement: "x" }).path, `/api/v1/decisions/${D}/assumptions`);
  assert.deepEqual(whyRoutes.edit(A, { statement: "y" }), { method: "PATCH", path: `/api/v1/assumptions/${A}`, body: { statement: "y" } });
  assert.deepEqual(whyRoutes.remove(A), { method: "DELETE", path: `/api/v1/assumptions/${A}` });
  assert.deepEqual(whyRoutes.reconfirm(A, "ok").body, { note: "ok" });
  assert.deepEqual(whyRoutes.reopen(A, null).body, {});
  assert.deepEqual(whyRoutes.reopen(A, "why").body, { note: "why" });
  assert.equal(whyRoutes.revisitSlot(A).path, `/api/v1/assumptions/${A}/revisit-slot`);
  assert.deepEqual(whyRoutes.bookRevisit(A, null).body, {});
  assert.deepEqual(whyRoutes.bookRevisit(A, "2026-11-12T09:30:00Z").body, { start: "2026-11-12T09:30:00Z" });
});

test("the owner's draft is checked before it is sent", () => {
  assert.deepEqual(checkDraft(EMPTY_DRAFT), { ok: false, field: "statement", message: "Say what has to stay true." });
  assert.equal(checkDraft({ ...EMPTY_DRAFT, statement: "x".repeat(301) }).ok, false);
  assert.deepEqual(checkDraft({ ...EMPTY_DRAFT, statement: "ok", value: "lots" }), { ok: false, field: "value", message: "Use a number, such as 40000." });
  assert.deepEqual(checkDraft({ ...EMPTY_DRAFT, statement: "ok", unit: "USD" }), { ok: false, field: "value", message: "Add the number the unit belongs to." });
  assert.equal(checkDraft({ ...EMPTY_DRAFT, statement: "ok", jiraKey: "not a key" }).ok, false);
  const good = checkDraft({ ...EMPTY_DRAFT, kind: "price", statement: "  Quote   under 40k ", value: "40,000", unit: "USD", jiraKey: "sso-142" });
  assert.ok(good.ok);
  assert.deepEqual(good.body, {
    kind: "price",
    statement: "Quote under 40k",
    quote: null,
    stated_by_user_id: null,
    watch: { date: null, value: 40000, comparator: "eq", unit: "USD", jira_key: "SSO-142", deal_id: null },
  });
});

test("an assumption round-trips through its draft", () => {
  const a = normalizeWhy(WIRE)!.assumptions[1];
  const check = checkDraft(draftOf(a));
  assert.ok(check.ok);
  assert.equal(check.body.watch.value, 40000);
  assert.equal(check.body.watch.comparator, "lt");
  assert.equal(check.body.stated_by_user_id, "u-maya");
  assert.equal(check.body.quote, a.quote);
});

test("re-confirming needs a short note", () => {
  assert.equal(checkNote("   ").ok, false);
  assert.equal(checkNote("x".repeat(501)).ok, false);
  assert.deepEqual(checkNote("  Acme  held the price "), { ok: true, note: "Acme held the price" });
});

test("?assumption= takes only a uuid", () => {
  assert.equal(focusIdOf(A.toUpperCase()), A);
  assert.equal(focusIdOf("nope"), null);
  assert.equal(focusIdOf(null), null);
});
