/* Fixed data for the "decisions that know why", blast radius and settle thread components, in the
   contract's exact shapes, with the house's sample people. Shared by WhyBlastHarness and the
   server-action stubs. */

import type { Assumption, BlastRadius, DecisionWhy, Evidence, MeetingBlastItem, RippleItem, Settlement } from "../../src/lib/api/why-blast-types";

export const MEETING = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
export const DECISION = "33333333-3333-4333-8333-333333333333";
export const DECISION_2 = "44444444-4444-4444-8444-444444444444";
export const A_PRICE = "a1111111-1111-4111-8111-111111111111";
export const A_DATE = "a2222222-2222-4222-8222-222222222222";
export const A_PERSON = "a3333333-3333-4333-8333-333333333333";
export const A_METRIC = "a4444444-4444-4444-8444-444444444444";
export const SETTLE = "55555555-5555-4555-8555-555555555555";

const sarah = { user_id: "u-sarah", name: "Sarah Okafor" };
const raj = { user_id: "u-raj", name: "Raj Patel" };
const maya = { user_id: "u-maya", name: "Maya Chen" };
const priya = { user_id: "u-priya", name: "Priya Nair" };

export const EVIDENCE: Evidence = {
  id: "e1111111-1111-4111-8111-111111111111",
  source: "meeting",
  quote: "Acme came back this morning: the renewal quote is fifty-two thousand, and they won't move on it.",
  redacted: false,
  speaker: raj,
  source_meeting: { id: "9b1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", title: "Vendor sync", date: "2026-11-10T15:00:00Z" },
  source_decision_id: null,
  source_ref: null,
  source_url: null,
  rationale: "Acme's quote is now $52,000, above the $40,000 the decision assumed.",
  confidence: 0.88,
  status: "open",
  created_at: "2026-11-10T15:20:00Z",
  resolved_at: null,
  resolved_by: null,
  resolution_note: null,
  revisit_meeting_id: null,
};

const base = (a: Partial<Assumption> & Pick<Assumption, "id" | "kind" | "statement">): Assumption => ({
  decision_id: DECISION,
  quote: null,
  stated_by: null,
  source: "agent",
  status: "watching",
  watch: { date: null, value: null, comparator: null, unit: null, jira_key: null, deal_id: null },
  reconfirmed_at: null,
  reconfirm_note: null,
  last_checked_at: "2026-11-11T06:00:00Z",
  created_at: "2026-11-03T10:00:00Z",
  open_break: null,
  history: [],
  ...a,
});

export const ASSUMPTIONS: Assumption[] = [
  base({
    id: A_PRICE,
    kind: "price",
    statement: "Acme's quote stays under $40,000 a year",
    quote: "If they hold the price at forty, we sign this quarter.",
    stated_by: maya,
    status: "broken",
    watch: { date: null, value: 40000, comparator: "lt", unit: "USD", jira_key: null, deal_id: null },
    open_break: EVIDENCE,
  }),
  base({
    id: A_DATE,
    kind: "dependency",
    statement: "Acme ships SAML single sign-on by December 1",
    quote: "Their SAML work lands before our December rollout, so we don't build it ourselves.",
    stated_by: raj,
    watch: { date: "2026-12-01", value: null, comparator: null, unit: null, jira_key: "SSO-142", deal_id: null },
    created_at: "2026-11-03T10:01:00Z",
  }),
  base({
    id: A_PERSON,
    kind: "person",
    statement: "Diego stays the Acme account lead through the migration",
    stated_by: sarah,
    source: "owner",
    reconfirmed_at: "2026-11-06T10:00:00Z",
    reconfirm_note: "Diego confirmed he stays on until March.",
    created_at: "2026-11-03T10:02:00Z",
    history: [
      {
        ...EVIDENCE,
        id: "e0000000-0000-4000-8000-000000000000",
        quote: "Diego might move to the EMEA team next month.",
        rationale: "Diego may leave the account before the migration ends.",
        status: "reconfirmed",
        resolved_at: "2026-11-06T10:00:00Z",
        resolved_by: sarah,
        resolution_note: "Diego confirmed he stays on until March.",
      },
    ],
  }),
  base({
    id: A_METRIC,
    kind: "metric",
    statement: "Login failures stay under 2% after the switch",
    watch: { date: null, value: 2, comparator: "lt", unit: "%", jira_key: null, deal_id: null },
    created_at: "2026-11-03T10:03:00Z",
  }),
];

export const WHY: DecisionWhy = {
  decision_id: DECISION,
  meeting_id: MEETING,
  content: "Go with Acme as our SSO vendor",
  owner: sarah,
  can_edit: true,
  state: "ready",
  reopened: null,
  assumptions: ASSUMPTIONS,
  sources: { transcripts: "connected", jira: "connected", linear: "not_connected", hubspot: "not_connected", checked_at: "2026-11-11T06:00:00Z" },
};

export const WHY_PENDING: DecisionWhy = { ...WHY, state: "pending", assumptions: [] };
export const WHY_EMPTY: DecisionWhy = { ...WHY, assumptions: [] };
export const WHY_READONLY: DecisionWhy = { ...WHY, can_edit: false };
export const WHY_QUIET: DecisionWhy = { ...WHY, assumptions: ASSUMPTIONS.slice(1) };
export const WHY_REDACTED: DecisionWhy = {
  ...WHY,
  assumptions: [{ ...ASSUMPTIONS[0], open_break: { ...EVIDENCE, redacted: true, quote: null, speaker: null, source_meeting: { id: EVIDENCE.source_meeting!.id, title: null, date: EVIDENCE.source_meeting!.date } } }, ...ASSUMPTIONS.slice(1)],
};
export const WHY_REOPENED: DecisionWhy = {
  ...WHY,
  reopened: { at: "2026-11-11T09:00:00Z", by: sarah, note: "Acme raised the price, so we are looking at vendors again." },
  assumptions: [
    { ...ASSUMPTIONS[0], status: "watching", open_break: null, history: [{ ...EVIDENCE, status: "reopened", resolved_at: "2026-11-11T09:00:00Z", resolved_by: sarah }] },
    ...ASSUMPTIONS.slice(1),
  ],
};

const ri = (r: Partial<RippleItem> & Pick<RippleItem, "id" | "kind" | "ring" | "effect">): RippleItem => ({
  label: null,
  why: null,
  href: null,
  redacted: false,
  owner: null,
  team: null,
  status: null,
  due: null,
  settlement_id: null,
  ...r,
});

const RING1: RippleItem[] = [
  ri({ id: "r1-1", kind: "action", ring: 1, effect: "changes", label: "Draft the Okta migration plan", why: "The plan assumed Okta; it now follows Acme's setup guide.", href: "/work/tasks?focus=r1-1", owner: raj, status: "confirmed", due: "2026-11-20" }),
  ri({ id: "r1-2", kind: "action", ring: 1, effect: "blocks", label: "Renew the Okta contract", why: "Renewing would pay for a vendor we are leaving.", href: "/work/tasks?focus=r1-2", owner: priya, status: "confirmed", due: "2026-11-30" }),
  ri({ id: "r1-3", kind: "action", ring: 1, effect: "unblocks", label: "Turn on SSO for the design partners", why: "Waiting on a vendor choice; now it can start.", href: "/work/tasks?focus=r1-3", owner: maya, status: "confirmed" }),
  ri({ id: "r1-4", kind: "action", ring: 1, effect: "changes", label: "Update the security questionnaire answers", href: "/work/tasks?focus=r1-4", owner: sarah, due: "2026-12-05" }),
];
const RING2: RippleItem[] = [
  ri({ id: "r2-1", kind: "goal", ring: 2, effect: "advances", label: "Enterprise-ready by Q1", why: "SSO is the last item on the enterprise checklist.", href: "/workspace/brain/goals", status: "active" }),
  ri({ id: "r2-2", kind: "goal", ring: 2, effect: "risks", label: "Cut tooling spend by 10%", why: "Acme costs more than the current plan until the Okta contract ends.", href: "/workspace/brain/goals", status: "active" }),
  ri({ id: "r2-3", kind: "decision", ring: 2, effect: "contradicts", redacted: true, team: "Sales", settlement_id: SETTLE }),
];
const RING3: RippleItem[] = [
  ri({ id: "r3-1", kind: "customer_action", ring: 3, effect: "commits", label: "Send Northwind the SSO rollout date", why: "Promised to Northwind in last week's renewal call.", href: "/work/tasks?focus=r3-1", owner: { user_id: "u-diego", name: "Diego Ramos" }, due: "2026-11-18" }),
];

export const BLAST: BlastRadius = {
  decision_id: DECISION,
  meeting_id: MEETING,
  content: WHY.content,
  state: "ready",
  summary: "Changes 4 tasks, moves 2 goals, clashes with 1 decision from Sales",
  counts: { actions: 4, goals: 2, decisions: 1, customers: 1 },
  rings: [
    { ring: 1, label: "Work it changes", items: RING1 },
    { ring: 2, label: "Goals and other teams", items: RING2 },
    { ring: 3, label: "Customers", items: RING3 },
  ],
  crm: { hubspot: "not_connected" },
};

export const BLAST_MANY: BlastRadius = {
  ...BLAST,
  summary: "Changes 10 tasks, moves 2 goals, clashes with 1 decision from Sales",
  counts: { actions: 10, goals: 2, decisions: 1, customers: 1 },
  rings: [
    {
      ring: 1,
      label: "Work it changes",
      items: [
        ...RING1,
        ...["Brief support on the new login page", "Move the staging tenant to Acme", "Rotate the SAML signing keys", "Retire the Okta admin accounts", "Write the SSO help article", "Tell the partner team about the switch"].map((label, i) =>
          ri({ id: `r1-x${i}`, kind: "action", ring: 1, effect: "changes", label, href: `/work/tasks?focus=r1-x${i}`, owner: raj }),
        ),
      ],
    },
    BLAST.rings[1],
    BLAST.rings[2],
  ],
};

export const BLAST_PENDING: BlastRadius = { ...BLAST, state: "pending", summary: "", counts: { actions: 0, goals: 0, decisions: 0, customers: 0 }, rings: BLAST.rings.map((r) => ({ ...r, items: [] })) };
export const BLAST_EMPTY: BlastRadius = { ...BLAST_PENDING, state: "ready", summary: "No ripple found" };

export const MEETING_BLAST: MeetingBlastItem[] = [
  { decision_id: DECISION, content: WHY.content, state: "ready", summary: BLAST.summary, counts: BLAST.counts },
  { decision_id: DECISION_2, content: "Ship the beta to 10 design partners first", state: "pending", summary: "", counts: { actions: 0, goals: 0, decisions: 0, customers: 0 } },
];

const sideMine = {
  decision_id: DECISION,
  meeting_id: MEETING,
  meeting_title: "Security review",
  decided_at: "2026-11-03T10:00:00Z",
  owner: sarah,
  team: "Platform",
  content: "Go with Acme as our SSO vendor",
  quote: "Acme gives us SAML by December and costs less than renewing Okta.",
  quote_speaker: sarah,
  visible: true,
  shared: false,
  mine: true,
};
const sideTheirs = {
  decision_id: "66666666-6666-4666-8666-666666666666",
  meeting_id: "77777777-7777-4777-8777-777777777777",
  meeting_title: null,
  decided_at: "2026-11-06T14:00:00Z",
  owner: priya,
  team: "Sales",
  content: null,
  quote: null,
  quote_speaker: null,
  visible: false,
  shared: false,
  mine: false,
};

export const SETTLEMENT: Settlement = {
  id: SETTLE,
  status: "open",
  created_at: "2026-11-10T16:00:00Z",
  confidence: 0.81,
  rationale: "Platform is leaving Okta, while Sales promised Northwind an Okta-based login through their renewal in March.",
  mine: sideMine,
  theirs: sideTheirs,
  proposal: null,
  resolution: null,
  messages: [
    { id: "m1", author: priya, mine: false, body: "Saw the clash flag. Northwind's renewal deck mentions Okta by name. When does the switch happen for them?", created_at: "2026-11-10T16:20:00Z" },
    { id: "m2", author: sarah, mine: true, body: "Not before January. We can keep Okta for Northwind's tenant until their renewal.", created_at: "2026-11-10T16:41:00Z" },
  ],
};

export const SETTLEMENT_SHARED: Settlement = {
  ...SETTLEMENT,
  theirs: { ...sideTheirs, visible: true, shared: true, meeting_title: "Northwind renewal", content: "Promise Northwind Okta login through March", quote: "We keep their Okta login exactly as it is until the renewal.", quote_speaker: priya },
};
export const SETTLEMENT_PROPOSAL: Settlement = { ...SETTLEMENT_SHARED, proposal: { winner_decision_id: sideTheirs.decision_id, by_me: false, at: "2026-11-11T08:00:00Z" } };
export const SETTLEMENT_RESOLVED: Settlement = {
  ...SETTLEMENT_SHARED,
  status: "kept_both",
  resolution: { by: priya, at: "2026-11-11T09:30:00Z", note: "Northwind keeps Okta on its own tenant until March; everyone else moves to Acme.", winner_decision_id: null, meeting_id: null },
};

export const MEMBERS = [
  { id: "u-sarah", name: "Sarah Okafor", email: "sarah@example.com", imageUrl: null, isYou: true },
  { id: "u-raj", name: "Raj Patel", email: "raj@example.com", imageUrl: null, isYou: false },
  { id: "u-maya", name: "Maya Chen", email: "maya@example.com", imageUrl: null, isYou: false },
  { id: "u-priya", name: "Priya Nair", email: "priya@example.com", imageUrl: null, isYou: false },
];

export const SLOT = {
  start: "2026-11-12T10:00:00Z",
  end: "2026-11-12T10:15:00Z",
  title: "Revisit: Go with Acme as our SSO vendor",
  people: [sarah, maya, raj],
};
