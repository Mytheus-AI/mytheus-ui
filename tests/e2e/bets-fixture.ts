import type { Bet, Calibration, DecisionBetView, Diff, MyBet, Snapshot, Timeline } from "../../src/lib/api/bets-types";

/* Fixed data for the decisions-as-bets and time-machine components, with the house's sample
   people. Dates sit around 11 November 2026. */

export const TODAY = "2026-11-11";
export const DECISION_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
export const MEETING_ID = "5f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

export const BET: Bet = {
  id: "7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  decision_id: DECISION_ID,
  meeting_id: MEETING_ID,
  status: "open",
  statement: "Annual billing cuts monthly churn by 3 points by 31 March",
  kind: "metric",
  metric: "Monthly churn",
  direction: "decrease",
  magnitude: 3,
  unit: "points",
  baseline: 7.4,
  check_date: "2027-03-31",
  source: "metrics",
  metric_key: null,
  category: "pricing",
  confidence_pct: 70,
  assumption: "Monthly customers take the annual discount",
  quote: "this should cut churn by 3 points by March",
  quote_speaker_name: "Priya Nair",
  proposed_by: "person",
  agent_confidence: null,
  owner_user_id: "11111111-2222-4333-8444-555555555555",
  owner_name: "Maya Patel",
  team_id: null,
  team_name: "Growth",
  evidence_status: "pending",
  checked_at: null,
  suggested_outcome: null,
  suggested_reason: null,
  observed_value: null,
  outcome: null,
  assumption_held: null,
  lesson: null,
  resolved_at: null,
  resolved_by_name: null,
  created_at: "2026-11-04T15:00:00Z",
  updated_at: "2026-11-04T15:00:00Z",
  evidence: [],
};

const HINTS = {
  category: "pricing" as const,
  record: { category: "pricing" as const, resolved: 5, hit: 2, partly: 1, missed: 2, hit_rate: 0.5 },
  lessons: [
    {
      category: "pricing" as const,
      statement: "The team plan price rise keeps net revenue retention above 110%",
      outcome: "partly" as const,
      lesson: "Price changes need a full quarter before churn moves",
      failed_assumption: null,
      resolved_at: "2026-09-30T10:00:00Z",
      decision_id: null,
      meeting_id: null,
    },
  ],
};

const OWNERS = [
  { user_id: "11111111-2222-4333-8444-555555555555", name: "Maya Patel" },
  { user_id: "21111111-2222-4333-8444-555555555555", name: "Raj Mehta" },
  { user_id: "31111111-2222-4333-8444-555555555555", name: "Priya Nair" },
];

export function view(bet: Bet | null, canEdit = true): DecisionBetView {
  return {
    decision_id: DECISION_ID,
    meeting_id: MEETING_ID,
    decision_status: "confirmed",
    bet,
    can_edit: canEdit,
    owner_candidates: OWNERS,
    teams: [
      { id: "41111111-2222-4333-8444-555555555555", name: "Growth" },
      { id: "51111111-2222-4333-8444-555555555555", name: "Platform" },
    ],
    hints: HINTS,
  };
}

export const PROPOSED: Bet = { ...BET, status: "proposed", proposed_by: "agent", agent_confidence: 0.84, confidence_pct: null };
export const DUE: Bet = {
  ...BET,
  status: "due",
  check_date: "2026-11-10",
  evidence_status: "gathered",
  checked_at: "2026-11-10T08:00:00Z",
  suggested_outcome: "partly",
  suggested_reason: "Moved part of the way: down 1.9 points to 5.5 points (was 7.4 points), expected 3 points",
  observed_value: 5.5,
  evidence: [
    { id: "e1", kind: "metric", visible: true, title: "Monthly churn: 5.5 from 2026-08-11 to 2026-11-10", detail: "Moved part of the way: down 1.9 points", signal: "neutral", occurred_at: "2026-11-10T12:00:00Z" },
    { id: "e2", kind: "jira", visible: true, title: "2 of 3 Jira issues from this meeting are done", detail: "The work the meeting agreed on, as Jira sees it on the check date.", signal: "neutral", occurred_at: "2026-11-10T12:00:00Z" },
    { id: "e3", kind: "decision", visible: true, title: "Offer a churn-save discount to monthly customers", meeting_id: MEETING_ID, decision_id: DECISION_ID, meeting_title: "Retention review", signal: "neutral", occurred_at: "2026-10-02T10:00:00Z" },
    { id: "e4", kind: "meeting", visible: false, title: "A later meeting you were not in", signal: "neutral", occurred_at: "2026-10-20T10:00:00Z" },
  ],
};
export const RESOLVED: Bet = {
  ...DUE,
  status: "resolved",
  outcome: "partly",
  assumption_held: false,
  lesson: "Annual discounts move churn slowly; give it two quarters next time",
  resolved_at: "2026-11-11T09:00:00Z",
  resolved_by_name: "Maya Patel",
};

export const CALIBRATION: Calibration = {
  totals: { bets: 23, proposed: 2, open: 7, due: 1, resolved: 13, hit: 6, partly: 4, missed: 3, hit_rate: 0.615, brier: 0.19 },
  by_category: [
    { key: "pricing", label: "Pricing", resolved: 5, hit: 2, partly: 1, missed: 2, open: 2, hit_rate: 0.5, stated_confidence: 0.74 },
    { key: "product", label: "Product", resolved: 4, hit: 3, partly: 1, missed: 0, open: 3, hit_rate: 0.875, stated_confidence: 0.68 },
    { key: "hiring", label: "Hiring and people", resolved: 2, hit: 0, partly: 1, missed: 1, open: 1, hit_rate: 0.25, stated_confidence: null },
    { key: "engineering", label: "Engineering", resolved: 2, hit: 1, partly: 1, missed: 0, open: 1, hit_rate: 0.75, stated_confidence: 0.8 },
  ],
  by_team: [
    { key: "t1", label: "Growth", resolved: 6, hit: 3, partly: 1, missed: 2, open: 3, hit_rate: 0.583, stated_confidence: 0.75 },
    { key: "t2", label: "Platform", resolved: 4, hit: 2, partly: 2, missed: 0, open: 2, hit_rate: 0.75, stated_confidence: 0.7 },
  ],
  teams_below_threshold: 2,
  min_team_resolved: 3,
  buckets: [
    { label: "50-59%", low: 50, high: 59, count: 2, stated: 0.55, actual: 0.5 },
    { label: "60-69%", low: 60, high: 69, count: 3, stated: 0.63, actual: 0.67 },
    { label: "70-79%", low: 70, high: 79, count: 4, stated: 0.72, actual: 0.5 },
    { label: "80-89%", low: 80, high: 89, count: 3, stated: 0.83, actual: 0.67 },
    { label: "90-99%", low: 90, high: 99, count: 1, stated: 0.9, actual: 1 },
  ],
  failing_assumptions: [
    { assumption: "Monthly customers take the annual discount", times: 2, categories: ["pricing"], last_failed_at: "2026-10-30T10:00:00Z" },
    { assumption: "Two engineers are enough for the migration", times: 1, categories: ["engineering"], last_failed_at: "2026-09-12T10:00:00Z" },
  ],
  lessons: [
    { category: "pricing", outcome: "partly", lesson: "Price changes need a full quarter before churn moves", resolved_at: "2026-10-30T10:00:00Z" },
    { category: "product", outcome: "hit", lesson: "Shipping to design partners first caught the onboarding gaps early", resolved_at: "2026-10-12T10:00:00Z" },
  ],
  months: [
    { month: "2026-06", resolved: 1, hit_rate: 1 },
    { month: "2026-07", resolved: 2, hit_rate: 0.5 },
    { month: "2026-08", resolved: 3, hit_rate: 0.667 },
    { month: "2026-09", resolved: 2, hit_rate: 0.5 },
    { month: "2026-10", resolved: 4, hit_rate: 0.625 },
    { month: "2026-11", resolved: 1, hit_rate: 0.5 },
  ],
};

export const EMPTY_CALIBRATION: Calibration = {
  totals: { bets: 0, proposed: 0, open: 0, due: 0, resolved: 0, hit: 0, partly: 0, missed: 0, hit_rate: null, brier: null },
  by_category: [],
  by_team: [],
  teams_below_threshold: 0,
  min_team_resolved: 3,
  buckets: [],
  failing_assumptions: [],
  lessons: [],
  months: [],
};

export const MINE: MyBet[] = [
  { bet: DUE, decision_content: "Move every plan to annual billing from January", meeting_title: "Billing review", needs_you: true },
  { bet: { ...PROPOSED, id: "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", statement: "The free trial without a card reaches 40 new trials a week" }, decision_content: "Launch the free trial without a credit card", meeting_title: "Growth sync", needs_you: true },
];

const M = (id: string, title: string, date: string) => ({ id, title, date });
const PRICING = M("a1111111-2222-4333-8444-555555555555", "Pricing review", "2026-06-10T10:00:00Z");
const FOLLOW = M("b1111111-2222-4333-8444-555555555555", "Pricing follow-up", "2026-10-01T10:00:00Z");
const BUDGET = M("c1111111-2222-4333-8444-555555555555", "Budget", "2026-07-05T10:00:00Z");

export const SNAPSHOT: Snapshot = {
  as_of: "2026-07-31",
  topic: null,
  earliest: "2026-06-10",
  counts: { in_force: 2, replaced: 0, promises_open: 2, promises_overdue: 1, goals_active: 2, bets_waiting: 1, meetings: 2 },
  decisions: [
    { id: "d2", content: "Hire two engineers for the platform team", rationale: "The migration needs owners before Q4", quote: "Two people, starting in August", quote_speaker_name: "Raj Mehta", confirmed_by_name: "Maya Patel", meeting: BUDGET, decided_at: "2026-07-05T10:00:00Z", replaces: null, bet: null },
    {
      id: "d1",
      content: "Price the starter plan at 19 dollars",
      rationale: "Undercut the two closest rivals while the product is young",
      quote: "Let us go with nineteen for starter",
      quote_speaker_name: "Maya Patel",
      confirmed_by_name: "Maya Patel",
      meeting: PRICING,
      decided_at: "2026-06-10T10:00:00Z",
      replaces: null,
      bet: { id: "b1", statement: "Starter sign-ups grow 20% by September", check_date: "2026-09-30", status: "waiting", outcome: null },
    },
  ],
  replaced: [],
  promises: [
    { id: "p1", kind: "action", content: "Email the resellers about the new price", owner_name: "Raj Mehta", due: "2026-06-25", overdue: true, meeting: PRICING, made_at: "2026-06-10T10:00:00Z" },
    { id: "p2", kind: "promise", content: "Send Priya the pricing deck", owner_name: "You", due: "by Friday", overdue: false, meeting: PRICING, made_at: "2026-06-10T10:00:00Z" },
  ],
  goals: [
    { id: "g1", title: "Reach 500 paying teams", period: "2026", status: "active", owner_name: "Maya Patel" },
    { id: "g2", title: "Launch in Europe", period: "H2 2026", status: "active", owner_name: null },
  ],
  truncated: false,
};

export const DIFF: Diff = {
  from: "2026-06-01",
  to: "2026-10-31",
  topic: null,
  counts: { new_decisions: 2, reversed: 1, promises_made: 2, promises_kept: 1, promises_broken: 1, bets_resolved: 1, goals_changed: 1 },
  new_decisions: [SNAPSHOT.decisions[1], { ...SNAPSHOT.decisions[1], id: "d4", content: "Offer annual pricing at 290 dollars", meeting: FOLLOW, decided_at: "2026-10-01T10:00:00Z", quote: null, bet: null }],
  reversed: [
    {
      old: { visible: true, id: "d1", content: "Price the starter plan at 19 dollars", meeting: PRICING, decided_at: "2026-06-10T10:00:00Z" },
      new: { visible: false, decided_at: "2026-09-02T10:00:00Z" },
      replaced_at: "2026-09-02T10:00:00Z",
      caused_by: null,
    },
  ],
  promises_made: [{ id: "p1", kind: "action", content: "Email the resellers about the new price", owner_name: "Raj Mehta", due_date: "2026-06-25", at: "2026-06-10T10:00:00Z", caused_by: PRICING }],
  promises_kept: [{ id: "p3", kind: "action", content: "Draft the pricing page", owner_name: "Priya Nair", due_date: "2026-06-20", at: "2026-06-18T10:00:00Z", on_time: true, caused_by: PRICING }],
  promises_broken: [{ id: "p1", kind: "action", content: "Email the resellers about the new price", owner_name: "Raj Mehta", due_date: "2026-06-25", at: "2026-06-25T23:59:59Z", on_time: false, kept_later_at: "2026-07-02T10:00:00Z", caused_by: PRICING }],
  bets_resolved: [{ id: "b1", decision_id: "d1", statement: "Starter sign-ups grow 20% by September", outcome: "missed", resolved_at: "2026-10-01T10:00:00Z", caused_by: PRICING }],
  goals: [{ id: "g2", title: "Launch in Europe", change: "added", at: "2026-07-01T10:00:00Z" }],
  meetings: [
    { meeting: PRICING, new_decisions: 1, reversals: 0, promises_made: 1 },
    { meeting: FOLLOW, new_decisions: 1, reversals: 0, promises_made: 0 },
  ],
};

export const TIMELINE: Timeline = {
  topic: "pricing",
  from: null,
  to: null,
  steps: [
    { at: "2026-06-10T10:00:00Z", kind: "decided", decision: { visible: true, id: "d1", content: "Price the starter plan at 19 dollars", meeting: PRICING, decided_at: "2026-06-10T10:00:00Z" }, rationale: "Undercut the two closest rivals", quote: "Let us go with nineteen for starter", quote_speaker_name: "Maya Patel", replaces: null, in_force_now: false, outcome: null, bet_statement: null },
    { at: "2026-09-02T10:00:00Z", kind: "replaced", decision: { visible: true, id: "d3", content: "Price the starter plan at 29 dollars", meeting: M("d1111111-2222-4333-8444-555555555555", "Pricing reset", "2026-09-02T10:00:00Z"), decided_at: "2026-09-02T10:00:00Z" }, rationale: "Nineteen did not cover support costs", quote: "Twenty-nine, and we grandfather everyone on nineteen", quote_speaker_name: "Diego Alvarez", replaces: { visible: true, id: "d1", content: "Price the starter plan at 19 dollars", meeting: PRICING, decided_at: "2026-06-10T10:00:00Z" }, in_force_now: true, outcome: null, bet_statement: null },
    { at: "2026-10-01T10:00:00Z", kind: "bet_resolved", decision: { visible: true, id: "d1", content: "Price the starter plan at 19 dollars", meeting: PRICING, decided_at: "2026-06-10T10:00:00Z" }, rationale: null, quote: null, quote_speaker_name: null, replaces: null, in_force_now: false, outcome: "missed", bet_statement: "Starter sign-ups grow 20% by September" },
    { at: "2026-10-01T11:00:00Z", kind: "decided", decision: { visible: true, id: "d4", content: "Offer annual pricing at 290 dollars", meeting: FOLLOW, decided_at: "2026-10-01T11:00:00Z" }, rationale: null, quote: null, quote_speaker_name: null, replaces: null, in_force_now: true, outcome: null, bet_statement: null },
  ],
  meetings: 3,
  in_force_now: 2,
};
