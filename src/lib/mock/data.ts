/* Static mock data for the authenticated app shell. Stands in for the
   `bff`/`api-gateway` responses until the backend exists — every page under
   (app)/ and (admin)/ reads from here instead of fetching. Replace with real
   `lib/api/` calls once core-api / bff ship. */

export type OrgContextValue = {
  org: { id: string; name: string; plan: "starter" | "pro" | "enterprise" };
  user: { id: string; name: string; email: string; role: "member" | "admin" };
};

export const mockOrgContext: OrgContextValue = {
  org: { id: "org_demo", name: "Acme Robotics", plan: "pro" },
  user: { id: "user_demo", name: "Yash Maurya", email: "yash@acme.test", role: "admin" },
};

export type MeetingStatus = "live" | "upcoming" | "past";

export type Meeting = {
  id: string;
  title: string;
  startTime: string; // ISO
  durationMinutes: number;
  status: MeetingStatus;
  participants: string[];
  decisionCount: number;
  actionCount: number;
};

export const mockMeetings: Meeting[] = [
  {
    id: "mtg_1",
    title: "Q3 Roadmap Sync",
    startTime: "2026-07-01T15:00:00Z",
    durationMinutes: 30,
    status: "live",
    participants: ["Yash Maurya", "Samar Rihan", "Sushan Shetty"],
    decisionCount: 0,
    actionCount: 1,
  },
  {
    id: "mtg_2",
    title: "Design Review — Onboarding Flow",
    startTime: "2026-07-01T18:00:00Z",
    durationMinutes: 45,
    status: "upcoming",
    participants: ["Yash Maurya", "Shaun Marvell Rodrigues"],
    decisionCount: 0,
    actionCount: 0,
  },
  {
    id: "mtg_3",
    title: "Weekly Standup",
    startTime: "2026-07-02T09:30:00Z",
    durationMinutes: 15,
    status: "upcoming",
    participants: ["Yash Maurya", "Samar Rihan", "Sushan Shetty", "Shaun Marvell Rodrigues"],
    decisionCount: 0,
    actionCount: 0,
  },
  {
    id: "mtg_4",
    title: "Vendor Call — Deepgram Renewal",
    startTime: "2026-06-29T14:00:00Z",
    durationMinutes: 30,
    status: "past",
    participants: ["Yash Maurya", "Sushan Shetty"],
    decisionCount: 1,
    actionCount: 2,
  },
  {
    id: "mtg_5",
    title: "Investor Update — June",
    startTime: "2026-06-27T16:00:00Z",
    durationMinutes: 60,
    status: "past",
    participants: ["Yash Maurya"],
    decisionCount: 2,
    actionCount: 1,
  },
];

export type Priority = "high" | "medium" | "low";

export type Decision = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  title: string;
  summary: string;
  priority: Priority;
  confirmedAt: string;
  /** FOLLOWS_FROM chain of meeting titles, oldest → this one */
  lineage?: string[];
};

export const mockDecisions: Decision[] = [
  {
    id: "dec_1",
    meetingId: "mtg_4",
    meetingTitle: "Vendor Call — Deepgram Renewal",
    title: "Renew Deepgram at the annual tier",
    summary: "Annual commit saves ~18% over month-to-month at our current transcription volume.",
    priority: "medium",
    confirmedAt: "2026-06-29T14:22:00Z",
    lineage: ["Vendor Shortlist — May", "Vendor Call — Deepgram Renewal"],
  },
  {
    id: "dec_2",
    meetingId: "mtg_5",
    meetingTitle: "Investor Update — June",
    title: "Push Series A outreach to August",
    summary: "Wait for the P4 real-time transcription demo to be stable before restarting investor conversations.",
    priority: "high",
    confirmedAt: "2026-06-27T16:41:00Z",
    lineage: ["Investor Update — May", "Investor Update — June"],
  },
  {
    id: "dec_3",
    meetingId: "mtg_5",
    meetingTitle: "Investor Update — June",
    title: "Keep runway at 18 months, no new hires this quarter",
    summary: "Hold headcount flat until P6 (AI infra) ships and GPU cost per meeting is known.",
    priority: "low",
    confirmedAt: "2026-06-27T16:55:00Z",
  },
];

export type ActionStatus = "open" | "done";

export type ActionItem = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  status: ActionStatus;
};

export const mockActions: ActionItem[] = [
  {
    id: "act_1",
    meetingId: "mtg_1",
    meetingTitle: "Q3 Roadmap Sync",
    title: "Draft P7 Personal Listener Agent spec",
    assignee: "Yash Maurya",
    dueDate: "2026-07-05",
    priority: "high",
    status: "open",
  },
  {
    id: "act_2",
    meetingId: "mtg_4",
    meetingTitle: "Vendor Call — Deepgram Renewal",
    title: "Send signed order form to Deepgram",
    assignee: "Sushan Shetty",
    dueDate: "2026-07-03",
    priority: "medium",
    status: "open",
  },
  {
    id: "act_3",
    meetingId: "mtg_4",
    meetingTitle: "Vendor Call — Deepgram Renewal",
    title: "Update budget sheet with new transcription line item",
    assignee: "Yash Maurya",
    dueDate: "2026-07-02",
    priority: "low",
    status: "done",
  },
  {
    id: "act_4",
    meetingId: "mtg_5",
    meetingTitle: "Investor Update — June",
    title: "Circulate updated 18-month runway model",
    assignee: "Yash Maurya",
    dueDate: "2026-07-04",
    priority: "medium",
    status: "open",
  },
];

export const mockBilling = {
  plan: "pro" as const,
  seatsUsed: 4,
  seatsTotal: 10,
  pricePerSeat: 24,
  billingCycle: "monthly" as const,
  nextInvoiceDate: "2026-08-01",
  nextInvoiceAmount: 96,
  invoices: [
    { id: "inv_2026_06", date: "2026-06-01", amount: 96, status: "paid" as const },
    { id: "inv_2026_05", date: "2026-05-01", amount: 72, status: "paid" as const },
    { id: "inv_2026_04", date: "2026-04-01", amount: 72, status: "paid" as const },
  ],
};

export type Tenant = {
  id: string;
  name: string;
  plan: "starter" | "pro" | "enterprise";
  seats: number;
  status: "active" | "trial" | "suspended";
  createdAt: string;
};

export const mockTenants: Tenant[] = [
  { id: "org_demo", name: "Acme Robotics", plan: "pro", seats: 10, status: "active", createdAt: "2026-05-12" },
  { id: "org_2", name: "Northwind Traders", plan: "starter", seats: 3, status: "trial", createdAt: "2026-06-20" },
  { id: "org_3", name: "Globex Logistics", plan: "enterprise", seats: 48, status: "active", createdAt: "2026-03-02" },
  { id: "org_4", name: "Initech Labs", plan: "starter", seats: 2, status: "suspended", createdAt: "2026-01-18" },
];

/* ---- landing "Between meetings" scene (Part 2 of the 4-July pass) ---- */

export type CapacityState = "over" | "near" | "ok";
export type TeammateCapacity = { name: string; util: number; state: CapacityState };

// util = % utilization this sprint; state drives bar color (over=red, near=amber, ok=clay)
// and mirrors ProactiveAgent's 80% (near) / 95% (over) capacity warnings.
export const mockTeamCapacity: TeammateCapacity[] = [
  { name: "Sarah",  util: 96, state: "over" },
  { name: "Priya",  util: 88, state: "near" },
  { name: "Aisha",  util: 74, state: "ok" },
  { name: "Marcus", util: 61, state: "ok" },
  { name: "Diego",  util: 45, state: "ok" },
];

export type SourcedAnswer = {
  quote: string;
  source: { meeting: string; date: string }; // human-readable; maps to meeting_id later
  lineage: string[];                          // FOLLOWS_FROM chain, oldest → newest
};

export const mockSourcedAnswer: SourcedAnswer = {
  quote: "Pricing was locked at $49 in the Q2 planning call — Sarah already owns the rework.",
  source: { meeting: "Q2 Planning", date: "Apr 3" },
  lineage: ["Q2 Planning", "Q3 Planning"],
};

export type SearchResult = {
  id: string;
  type: "meeting" | "decision" | "action";
  title: string;
  snippet: string;
  meetingId: string;
};

export const mockSearchIndex: SearchResult[] = [
  { id: "mtg_4", type: "meeting", title: "Vendor Call — Deepgram Renewal", snippet: "Discussed annual vs. monthly transcription pricing tiers.", meetingId: "mtg_4" },
  { id: "dec_1", type: "decision", title: "Renew Deepgram at the annual tier", snippet: "Annual commit saves ~18% over month-to-month.", meetingId: "mtg_4" },
  { id: "act_2", type: "action", title: "Send signed order form to Deepgram", snippet: "Assigned to Sushan Shetty, due 2026-07-03.", meetingId: "mtg_4" },
  { id: "mtg_5", type: "meeting", title: "Investor Update — June", snippet: "Runway, headcount, and Series A timing.", meetingId: "mtg_5" },
  { id: "dec_2", type: "decision", title: "Push Series A outreach to August", snippet: "Wait for the P4 transcription demo to stabilize first.", meetingId: "mtg_5" },
];

/* ---- meeting detail: agenda + wrap-up per meeting (Part 4b) ---- */

export type MeetingDetail = {
  meetingId: string;
  agenda: string[];
  recap?: string;
};

export const mockMeetingDetails: MeetingDetail[] = [
  {
    meetingId: "mtg_1",
    agenda: [
      "P7 Personal Listener Agent — spec review",
      "Q3 priorities: transcription latency vs. agent quality",
      "Pricing rework ownership",
    ],
  },
  {
    meetingId: "mtg_2",
    agenda: [
      "Walkthrough: new onboarding flow (Figma)",
      "Empty states and first-meeting experience",
      "Open questions for engineering",
    ],
  },
  {
    meetingId: "mtg_3",
    agenda: ["Yesterday / today / blockers", "Sprint burn-down check"],
  },
  {
    meetingId: "mtg_4",
    agenda: [
      "Current transcription volume & bill",
      "Annual vs. monthly tier pricing",
      "Contract terms and renewal date",
    ],
    recap:
      "Agreed to renew Deepgram on the annual tier (~18% saving at current volume). Sushan sends the signed order form; budget sheet gets a new transcription line item.",
  },
  {
    meetingId: "mtg_5",
    agenda: [
      "June metrics and runway",
      "Series A timing",
      "Hiring plan for Q3",
    ],
    recap:
      "Series A outreach moves to August pending a stable P4 demo. Runway held at 18 months with no new hires this quarter.",
  },
];

/* ---- transcript chunks (doc-20 transcript view; mock stand-in) ---- */

export type TranscriptChunk = {
  id: string;
  meetingId: string;
  speaker: string;
  /** offset from meeting start, mm:ss */
  at: string;
  text: string;
};

export const mockTranscriptChunks: TranscriptChunk[] = [
  { id: "tc_1", meetingId: "mtg_4", speaker: "Yash Maurya", at: "00:12", text: "Okay, main goal today is the Deepgram renewal — the monthly tier is starting to hurt at our volume." },
  { id: "tc_2", meetingId: "mtg_4", speaker: "Sushan Shetty", at: "00:31", text: "Right. We did about 41,000 transcription minutes last month. Month-to-month that lands near $340." },
  { id: "tc_3", meetingId: "mtg_4", speaker: "Yash Maurya", at: "01:02", text: "And the annual commit quote?" },
  { id: "tc_4", meetingId: "mtg_4", speaker: "Sushan Shetty", at: "01:09", text: "Roughly 18% under what we pay now, assuming volume stays flat or grows. It only breaks even against monthly if usage halves — which isn't the direction we're going." },
  { id: "tc_5", meetingId: "mtg_4", speaker: "Yash Maurya", at: "01:48", text: "Any lock-in concerns? If the P4 latency work stalls we might revisit providers." },
  { id: "tc_6", meetingId: "mtg_4", speaker: "Sushan Shetty", at: "02:05", text: "The annual term has a 60-day out clause for SLA breaches, and their diarization has been the best of the three we tested." },
  { id: "tc_7", meetingId: "mtg_4", speaker: "Yash Maurya", at: "02:44", text: "Fine — let's lock the annual tier. Can you own the paperwork?" },
  { id: "tc_8", meetingId: "mtg_4", speaker: "Sushan Shetty", at: "02:58", text: "Yep, I'll send the signed order form over by Friday." },
  { id: "tc_9", meetingId: "mtg_4", speaker: "Yash Maurya", at: "03:15", text: "I'll update the budget sheet with the new line item so June's numbers are clean." },
  { id: "tc_10", meetingId: "mtg_4", speaker: "Sushan Shetty", at: "03:29", text: "One more thing — usage alerts. I'll set a warning at 80% of the included minutes so we see overage coming." },
  { id: "tc_11", meetingId: "mtg_4", speaker: "Yash Maurya", at: "03:52", text: "Good call. Anything else? … Alright, that's a wrap." },
  { id: "tc_12", meetingId: "mtg_5", speaker: "Yash Maurya", at: "00:20", text: "June update: burn is steady, runway sits at 18 months as of this morning's model." },
  { id: "tc_13", meetingId: "mtg_5", speaker: "Yash Maurya", at: "04:41", text: "On the raise — I'd rather show the live transcription demo working than pitch a deck. Pushing outreach to August." },
  { id: "tc_14", meetingId: "mtg_5", speaker: "Yash Maurya", at: "09:03", text: "Headcount stays flat this quarter until we know GPU cost per meeting." },
];

/* ---- live meeting room: participants, captions, chat (mock) ---- */

export type RoomParticipant = {
  name: string;
  role: string;
  micOn: boolean;
  camOn: boolean;
  speaking?: boolean;
};

export const mockRoomParticipants: RoomParticipant[] = [
  { name: "Yash Maurya", role: "You · Founder", micOn: true, camOn: true },
  { name: "Samar Rihan", role: "Backend", micOn: true, camOn: true, speaking: true },
  { name: "Sushan Shetty", role: "Infra", micOn: false, camOn: true },
  { name: "Shaun Marvell Rodrigues", role: "Design", micOn: true, camOn: false },
];

export type CaptionLine = { speaker: string; text: string };

export const mockCaptions: CaptionLine[] = [
  { speaker: "Samar Rihan", text: "…so if we lock pricing at $49, the rework has to land before the Q3 launch date." },
  { speaker: "Yash Maurya", text: "Let's put the pricing rework on Sarah for Q3." },
];

export type ChatMessage = { id: string; from: string; at: string; text: string };

export const mockRoomChat: ChatMessage[] = [
  { id: "ch_1", from: "Sushan Shetty", at: "10:02", text: "Joining from the train, mic's flaky — will type." },
  { id: "ch_2", from: "Samar Rihan", at: "10:04", text: "Roadmap doc: notes/q3-roadmap (updated this morning)" },
  { id: "ch_3", from: "Shaun Marvell Rodrigues", at: "10:07", text: "+1 on shipping the sidebar polish first" },
];

/* ---- agent sidebar cards (frozen 9-section order, doc-20 §7 / A4) ---- */

export type SidebarPriority = "high" | "medium" | "low";

export type AgentSidebarCard =
  | { kind: "note"; lines: string[] }
  | { kind: "suggestion"; priority: SidebarPriority; text: string }
  | { kind: "decision"; title: string; detail: string }
  | { kind: "task"; title: string; assignee: string; due: string }
  | { kind: "context"; text: string; source: string }
  | { kind: "conflict"; text: string }
  | { kind: "workload"; person: string; util: number; text: string }
  | { kind: "stakeholder"; person: string; reason: string }
  | { kind: "dependency"; text: string };

/* one continuous story: the $49 pricing decision in Q3 planning */
export const mockAgentSidebar: AgentSidebarCard[] = [
  {
    kind: "note",
    lines: [
      "Launch at risk if the pricing decision slips past April.",
      "Rework scope depends on the $49 lock — confirm before sprint start.",
    ],
  },
  {
    kind: "suggestion",
    priority: "low",
    text: "“Do we have legal sign-off on the new pricing?” — worth asking before the announcement draft.",
  },
  {
    kind: "decision",
    title: "Lock pricing at $49 for Q3",
    detail: "Detected just now · needs your confirm",
  },
  {
    kind: "task",
    title: "Own the pricing rework",
    assignee: "Sarah",
    due: "Jul 18",
  },
  {
    kind: "context",
    text: "Pricing was locked at $49 in the Q2 planning call — Sarah already owns the rework.",
    source: "Sarah's agent · Q2 Planning · Apr 3",
  },
  {
    kind: "conflict",
    text: "This conflicts with the Q3 launch date decided in the Roadmap Sync.",
  },
  {
    kind: "workload",
    person: "Sarah",
    util: 96,
    text: "Sarah is at 96% — over capacity this sprint.",
  },
  {
    kind: "stakeholder",
    person: "Priya",
    reason: "owns billing — should hear the pricing change before it ships",
  },
  {
    kind: "dependency",
    text: "Pricing rework blocks the Q3 launch date.",
  },
];

/* ---- org chart (departments → teams → members) ---- */

export type TeamMember = { name: string; role: string; lead?: boolean };
export type Team = { id: string; name: string; members: TeamMember[] };
export type Department = { id: string; name: string; teams: Team[] };

export const mockDepartments: Department[] = [
  {
    id: "dep_eng",
    name: "Engineering",
    teams: [
      {
        id: "team_platform",
        name: "Platform",
        members: [
          { name: "Samar Rihan", role: "Backend lead", lead: true },
          { name: "Sushan Shetty", role: "Infra" },
        ],
      },
      {
        id: "team_web",
        name: "Web",
        members: [
          { name: "Yash Maurya", role: "Frontend lead", lead: true },
          { name: "Shaun Marvell Rodrigues", role: "Design engineer" },
        ],
      },
    ],
  },
  {
    id: "dep_biz",
    name: "Business",
    teams: [
      {
        id: "team_ops",
        name: "Operations",
        members: [{ name: "Yash Maurya", role: "Founder", lead: true }],
      },
    ],
  },
];

/* ---- integration connections (R8: Calendar + Slack + one of Jira/Linear) ---- */

export type IntegrationConnection = {
  key: "google_calendar" | "slack" | "jira" | "linear";
  name: string;
  description: string;
  status: "connected" | "available";
  account?: string;
};

export const mockIntegrations: IntegrationConnection[] = [
  {
    key: "google_calendar",
    name: "Google Calendar",
    description: "Meetings sync from your calendar; agents prep before you join.",
    status: "connected",
    account: "yash@acme.test",
  },
  {
    key: "slack",
    name: "Slack",
    description: "Confirmed decisions and action items route to the right channel.",
    status: "connected",
    account: "acme-robotics.slack.com",
  },
  {
    key: "linear",
    name: "Linear",
    description: "Confirmed action items become issues in your team's tracker.",
    status: "connected",
    account: "acme-robotics",
  },
  {
    key: "jira",
    name: "Jira",
    description: "One project tracker per workspace — disconnect Linear to switch.",
    status: "available",
  },
];

/* ---- internal ops console (cross-tenant, mock) ---- */

export type TenantOps = {
  orgId: string;
  name: string;
  plan: "starter" | "pro" | "enterprise";
  monthlyCostUsd: number;
  agentTokensM: number; // millions this month
  flags: string[];
  openTickets: number;
};

export const mockTenantOps: TenantOps[] = [
  { orgId: "org_demo", name: "Acme Robotics", plan: "pro", monthlyCostUsd: 61.4, agentTokensM: 9.2, flags: ["beta-sidebar"], openTickets: 1 },
  { orgId: "org_2", name: "Northwind Traders", plan: "starter", monthlyCostUsd: 8.3, agentTokensM: 0.6, flags: [], openTickets: 0 },
  { orgId: "org_3", name: "Globex Logistics", plan: "enterprise", monthlyCostUsd: 412.9, agentTokensM: 58.7, flags: ["cell-isolated", "beta-sidebar"], openTickets: 3 },
  { orgId: "org_4", name: "Initech Labs", plan: "starter", monthlyCostUsd: 2.1, agentTokensM: 0.1, flags: ["suspended"], openTickets: 2 },
];
