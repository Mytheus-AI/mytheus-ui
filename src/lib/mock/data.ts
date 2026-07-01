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
  },
  {
    id: "dec_2",
    meetingId: "mtg_5",
    meetingTitle: "Investor Update — June",
    title: "Push Series A outreach to August",
    summary: "Wait for the P4 real-time transcription demo to be stable before restarting investor conversations.",
    priority: "high",
    confirmedAt: "2026-06-27T16:41:00Z",
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
