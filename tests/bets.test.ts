// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  brierWords,
  checkDraft,
  daysUntil,
  defaultCheckDate,
  draftFrom,
  expectationLine,
  outcomeLabel,
  outcomeTone,
  parseBetSource,
  pct,
  relativeDay,
  sizeLabel,
} from "../src/lib/bets.ts";

const TODAY = "2026-11-11";
const U = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

test("a new draft checks three months out and needs words", () => {
  const d = draftFrom(null, TODAY);
  assert.equal(d.check_date, "2027-02-11");
  assert.equal(defaultCheckDate("2026-11-30"), "2027-03-02");
  const r = checkDraft(d, TODAY);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.field, "statement");
});

test("a metric draft becomes the PUT body, numbers parsed and blanks null", () => {
  const d = {
    ...draftFrom(null, TODAY),
    statement: "  Annual billing   cuts churn by 3 points ",
    metric: "Monthly churn",
    direction: "decrease" as const,
    magnitude: "3",
    unit: "points",
    baseline: "7.5",
    confidence_pct: "70",
    category: "pricing" as const,
    owner_user_id: U,
  };
  const r = checkDraft(d, TODAY);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.body.statement, "Annual billing cuts churn by 3 points");
  assert.equal(r.body.magnitude, 3);
  assert.equal(r.body.baseline, 7.5);
  assert.equal(r.body.confidence_pct, 70);
  assert.equal(r.body.metric_key, null);
  assert.equal(r.body.owner_user_id, U);
  assert.equal(r.body.team_id, null);
});

test("the draft refuses what the server would", () => {
  const base = { ...draftFrom(null, TODAY), statement: "x", metric: "y" };
  const field = (over: object) => {
    const r = checkDraft({ ...base, ...over }, TODAY);
    return r.ok ? null : r.field;
  };
  assert.equal(field({ direction: "reach", magnitude: "" }), "magnitude");
  assert.equal(field({ magnitude: "lots" }), "magnitude");
  assert.equal(field({ check_date: TODAY }), "check_date");
  assert.equal(field({ kind: "event", direction: "increase" }), "direction");
  assert.equal(field({ source: "crm", metric_key: "salesforce.x" }), "metric_key");
  const event = checkDraft({ ...base, kind: "event", direction: "happen", magnitude: "9", unit: "x" }, TODAY);
  assert.ok(event.ok && event.body.magnitude === null && event.body.unit === null);
});

test("an expectation reads like a sentence", () => {
  assert.equal(expectationLine({ kind: "metric", metric: "Monthly churn", direction: "decrease", magnitude: 3, unit: "points" }), "Monthly churn goes down by 3 points");
  assert.equal(expectationLine({ kind: "metric", metric: "Trials", direction: "reach", magnitude: 40, unit: null }), "Trials reaches 40");
  assert.equal(expectationLine({ kind: "event", metric: "Migration", direction: "happen", magnitude: null, unit: null }), "Migration happens");
  assert.equal(sizeLabel(15, "%"), "15%");
  assert.equal(sizeLabel(40000, "$"), "$40,000");
  assert.equal(sizeLabel(null, "x"), null);
});

test("dates relative to today", () => {
  assert.equal(daysUntil("2026-11-21", TODAY), 10);
  assert.equal(relativeDay("2026-11-21", TODAY), "in 10 days");
  assert.equal(relativeDay(TODAY, TODAY), "today");
  assert.equal(relativeDay("2026-11-12", TODAY), "tomorrow");
  assert.equal(relativeDay("2026-11-01", TODAY), "10 days ago");
  assert.equal(relativeDay("2027-05-11", TODAY), "in about 6 months");
});

test("outcomes, rates and calibration words", () => {
  assert.equal(outcomeLabel("partly"), "Partly");
  assert.equal(outcomeLabel("weird"), "");
  assert.equal(outcomeTone("hit"), "ok");
  assert.equal(outcomeTone("missed"), "neutral"); // the red sits on the icon (OutcomeChip)
  assert.equal(pct(0.667), "67%");
  assert.equal(pct(null), "No data");
  assert.match(brierWords(0.05), /Very well/);
  assert.match(brierWords(0.4), /Overconfident/);
});

test("bet notifications are recognised", () => {
  assert.deepEqual(parseBetSource(`decision-bet:${U}:due:2026-11-11`), { betId: U, stage: "due" });
  assert.deepEqual(parseBetSource(`decision-bet:${U}:proposed`), { betId: U, stage: "proposed" });
  assert.equal(parseBetSource("decision-bet:nope:due"), null);
  assert.equal(parseBetSource("weekly-digest:x"), null);
});

test("a bet notification leads to the bet and says what to do", async () => {
  const { describeNotification } = await import("../src/components/notifications/alert-copy.ts");
  const row = {
    id: "n1",
    meeting_id: null,
    source: "notification",
    alert_type: null,
    priority: 2,
    title: "Time to score a bet: Annual billing cuts churn",
    body: "The check date has come.",
    link: `/meetings/m1/decisions/d1#bet`,
    payload: { source_event_id: `decision-bet:${U}:due:2026-11-11` },
    status: "unread",
    created_at: "2026-11-11T08:00:00Z",
  };
  const item = describeNotification(row);
  assert.equal(item.href, "/meetings/m1/decisions/d1#bet");
  assert.equal(item.linkLabel, "Score the bet");
  assert.equal(item.priority, 2);
  const suggested = describeNotification({ ...row, payload: { source_event_id: `decision-bet:${U}:proposed` }, link: null });
  assert.equal(suggested.linkLabel, "Review it");
  assert.equal(suggested.href, "/decisions/calls");
});
