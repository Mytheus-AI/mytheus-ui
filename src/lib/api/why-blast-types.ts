/**
 * Wire types for "Decisions that know why", "Blast radius" and settle threads (a4 contract,
 * sections 3, 3b, 3c and 3d), all on core-api under `/api/v1`.
 *
 * Hand-written on purpose: the routes are new and not in `generated/core-api.ts` yet. They mirror
 * the contract exactly (snake_case, as the wire carries it). When the spec is regenerated these can
 * become aliases onto `CoreApi[...]` without touching any screen.
 */

/* ---------------- shared ---------------- */

export type Person = { user_id: string; name: string };

export type SourceState = "connected" | "not_connected" | "unknown";

/** An agent-proposed time for a short meeting (a revisit, or two owners settling a clash). */
export type SlotProposal = { start: string; end: string; people: Person[]; title: string };

/** A meeting the server just booked. */
export type BookedMeeting = { meeting_id: string; start: string; end: string; title: string };

/* ---------------- decisions that know why (3) ---------------- */

export const ASSUMPTION_KINDS = ["price", "date", "metric", "dependency", "person", "other"] as const;
export type AssumptionKind = (typeof ASSUMPTION_KINDS)[number];

export const COMPARATORS = ["lt", "lte", "gt", "gte", "eq"] as const;
export type Comparator = (typeof COMPARATORS)[number];

export type Watch = {
  date: string | null;
  value: number | null;
  comparator: Comparator | null;
  unit: string | null;
  jira_key: string | null;
  deal_id: string | null;
};

export type EvidenceSource = "meeting" | "decision" | "jira" | "linear" | "hubspot";
export type EvidenceStatus = "open" | "reconfirmed" | "reopened" | "revisit_booked";

export type Evidence = {
  id: string;
  source: EvidenceSource;
  /** null when redacted */
  quote: string | null;
  /** true: from a meeting the viewer was not in */
  redacted: boolean;
  speaker: Person | null;
  source_meeting: { id: string; title: string | null; date: string } | null;
  source_decision_id: string | null;
  /** "SSO-142", a HubSpot deal name */
  source_ref: string | null;
  source_url: string | null;
  /** one plain sentence: why this breaks the assumption */
  rationale: string;
  confidence: number;
  status: EvidenceStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: Person | null;
  resolution_note: string | null;
  revisit_meeting_id: string | null;
};

export type Assumption = {
  id: string;
  decision_id: string;
  kind: AssumptionKind;
  statement: string;
  quote: string | null;
  stated_by: Person | null;
  source: "agent" | "owner";
  status: "watching" | "broken";
  watch: Watch;
  reconfirmed_at: string | null;
  reconfirm_note: string | null;
  last_checked_at: string | null;
  created_at: string;
  /** set when status = broken */
  open_break: Evidence | null;
  /** resolved breaks, newest first */
  history: Evidence[];
};

export type DecisionWhy = {
  decision_id: string;
  meeting_id: string;
  content: string;
  owner: Person | null;
  /** the caller is the owner */
  can_edit: boolean;
  /** pending: the agent has not read the decision yet */
  state: "pending" | "ready";
  reopened: { at: string; by: Person | null; note: string | null } | null;
  assumptions: Assumption[];
  sources: {
    transcripts: "connected";
    jira: SourceState;
    linear: SourceState;
    hubspot: SourceState;
    checked_at: string | null;
  };
};

/** `POST /decisions/{id}/assumptions` */
export type AssumptionCreate = {
  kind: AssumptionKind;
  statement: string;
  quote?: string | null;
  stated_by_user_id?: string | null;
  watch?: Partial<Watch>;
};

/** `PATCH /assumptions/{id}`: any of these. */
export type AssumptionPatch = Partial<{
  kind: AssumptionKind;
  statement: string;
  quote: string | null;
  stated_by_user_id: string | null;
  watch: Partial<Watch>;
}>;

/* ---------------- blast radius (3b) ---------------- */

export type RippleKind = "action" | "goal" | "decision" | "customer_action" | "deal";
export type RippleEffect = "changes" | "blocks" | "unblocks" | "advances" | "risks" | "contradicts" | "commits";
export type RingNumber = 1 | 2 | 3;

export type RippleItem = {
  id: string;
  kind: RippleKind;
  ring: RingNumber;
  /** null when redacted */
  label: string | null;
  effect: RippleEffect;
  why: string | null;
  /** in-app link when the viewer may open it */
  href: string | null;
  /** another team's decision from a meeting the viewer was not in */
  redacted: boolean;
  owner: Person | null;
  team: string | null;
  status: string | null;
  due: string | null;
  /** set on a "contradicts" item when a settle thread exists */
  settlement_id: string | null;
};

export type BlastCounts = { actions: number; goals: number; decisions: number; customers: number };

export type BlastRadius = {
  decision_id: string;
  meeting_id: string;
  content: string;
  state: "pending" | "ready";
  /** the one line, "No ripple found" when empty */
  summary: string;
  counts: BlastCounts;
  /** always 3 rings, maybe empty */
  rings: { ring: RingNumber; label: string; items: RippleItem[] }[];
  crm: { hubspot: SourceState };
};

export type MeetingBlastItem = {
  decision_id: string;
  content: string;
  state: "pending" | "ready";
  summary: string;
  counts: BlastCounts;
};

export type MeetingBlastRadius = { items: MeetingBlastItem[] };

/* ---------------- decision reversal, additive (3c) ---------------- */

/** `DecisionReversal.kind`, added by the contract with the default "superseded". The generated
 *  type predates it, so it is read through `reversalKind` in `lib/settlements.ts`. */
export type ReversalKind = "superseded" | "reopened";

/* ---------------- settle threads (3d) ---------------- */

export type SettleSide = {
  decision_id: string;
  meeting_id: string;
  meeting_title: string | null;
  decided_at: string;
  owner: Person | null;
  team: string | null;
  /** null when hidden */
  content: string | null;
  quote: string | null;
  quote_speaker: Person | null;
  /** false: the viewer was not in that meeting and its owner has not shared it */
  visible: boolean;
  /** its owner chose to share the wording in this thread */
  shared: boolean;
  /** the viewer owns this side */
  mine: boolean;
};

export type SettlementStatus = "open" | "kept_both" | "superseded" | "meeting_booked";

export type SettleMessage = { id: string; author: Person | null; mine: boolean; body: string; created_at: string };

export type Settlement = {
  id: string;
  status: SettlementStatus;
  created_at: string;
  confidence: number;
  /** the agent's reason it may clash */
  rationale: string;
  mine: SettleSide;
  theirs: SettleSide;
  proposal: { winner_decision_id: string; by_me: boolean; at: string } | null;
  resolution: {
    by: Person | null;
    at: string;
    note: string | null;
    winner_decision_id: string | null;
    meeting_id: string | null;
  } | null;
  messages: SettleMessage[];
};

export type SettlementList = { items: Settlement[] };

/* ---------------- reads and writes, as screens receive them ---------------- */

/** A read for one panel: `none` when the server says there is nothing for this person (404),
 *  `forbidden` for a wrong role (403), `error` when it could not be read. */
export type Load<T> = { ok: true; data: T } | { ok: false; reason: "none" | "forbidden" | "error" };

export type ActFailure = {
  ok: false;
  message: string;
  /** forbidden 403, gone 404, conflict 409, invalid 422 (a limit or a bad field), error otherwise */
  code: "forbidden" | "gone" | "conflict" | "invalid" | "auth" | "error";
};
export type Act<T> = { ok: true; data: T } | ActFailure;
