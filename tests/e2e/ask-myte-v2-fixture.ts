/* Ask Myte v2 test data (ADR-0049): an answer proposing every new kind, peer questions on both
   sides, memories, routines and what the nudges are built from. Sample people from the design
   contract. */

import type { Memory, PeerQuestion, Routine, StreamEvent } from "../../src/lib/ask-myte/types";
import type { NudgeData } from "../../src/app/actions/myte-v2";

export const U_SAMAR = "88888888-8888-4888-8888-888888888881";
export const U_MAYA = "88888888-8888-4888-8888-888888888882";
export const U_RAJ = "88888888-8888-4888-8888-888888888883";
export const U_ME = "88888888-8888-4888-8888-888888888880";
export const MEET = "11111111-1111-4111-8111-111111111111";
export const DEC = "22222222-2222-4222-8222-222222222222";
export const PQ = "99999999-9999-4999-8999-999999999991";
export const PQ2 = "99999999-9999-4999-8999-999999999992";

const now = Date.now();
const iso = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();
const inMin = (m: number) => new Date(now + m * 60_000);
const tomorrowAt = (h: number, m = 0) => {
  const d = new Date(now + 86_400_000);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const MEMBERS = [
  { id: U_ME, name: "Sushan Shetty", email: "sushan@example.com" },
  { id: U_SAMAR, name: "Samar Rihan", email: "samar@example.com" },
  { id: U_MAYA, name: "Maya Chen", email: "maya@example.com" },
  { id: U_RAJ, name: "Raj Patel", email: "raj@example.com" },
];

export const user = (id: string, name: string, agent: string | null = null) => ({ id, name, agent_name: agent ?? `${name.split(" ")[0]}'s Myte`, agent_avatar_seed: null });

/** The four kinds the owner asked to see first, then the rest. */
export function proposalEvents(kinds: string[]): StreamEvent[] {
  const all: Record<string, StreamEvent> = {
    schedule_meeting: {
      event: "proposal",
      data: {
        id: "p-meet",
        kind: "schedule_meeting",
        title: "Pricing review",
        start: tomorrowAt(10),
        end: tomorrowAt(10, 30),
        attendee_ids: [U_MAYA, U_RAJ],
        attendee_names: ["Maya Chen", "Raj Patel"],
      },
    },
    invite_people: { event: "proposal", data: { id: "p-inv", kind: "invite_people", title: "Invite Raj Patel to Pricing review", meeting_id: MEET, user_ids: [U_RAJ], user_names: ["Raj Patel"] } },
    slack_post: { event: "proposal", data: { id: "p-slack", kind: "slack_post", title: "Post to Slack in #pricing", text: "Pricing moves to the new tiers on 1 December. Maya owns the page.", channel: "#pricing" } },
    export_decisions: { event: "proposal", data: { id: "p-exp", kind: "export_decisions", title: "Export decisions to Notion", destination: "notion", meeting_id: MEET } },
    share_decision: { event: "proposal", data: { id: "p-share", kind: "share_decision", title: "Share: Drop Google Drive access", decision_id: DEC, meeting_id: MEET } },
    ask_myte: { event: "proposal", data: { id: "p-ask", kind: "ask_myte", title: "Ask Samar Rihan's Myte", person_id: U_SAMAR, person_name: "Samar Rihan", question: "Where are we on the pricing page copy?" } },
    memory: { event: "proposal", data: { id: "p-mem", kind: "memory", title: "Remember: Prefers short bullet answers", text: "Prefers short bullet answers" } },
  } as unknown as Record<string, StreamEvent>;
  return [
    { event: "step", data: { id: "s1", label: "Checked your calendar", state: "done" } },
    { event: "delta", data: { text: "Here is what I can do for you. Nothing happens until you confirm." } },
    ...kinds.map((k) => all[k]),
    { event: "done", data: { abstained: false, degraded: false, cited: [] } },
    { event: "saved", data: { thread_id: "aaaaaaaa-0000-4000-8000-000000000009", message_ids: ["bbbbbbbb-0000-4000-8000-000000000001", "bbbbbbbb-0000-4000-8000-000000000002"] } },
  ];
}

export const PEER_SENT: PeerQuestion = {
  id: PQ,
  from_user: user(U_ME, "Sushan Shetty", "Pip"),
  to_user: user(U_SAMAR, "Samar Rihan", "Bolt"),
  question: "Where are we on the pricing page copy?",
  thread_id: "aaaaaaaa-0000-4000-8000-000000000009",
  status: "pending",
  answer: null,
  decline_reason: null,
  created_at: iso(2),
  answered_at: null,
};

export const PEER_INBOX: PeerQuestion[] = [
  {
    id: PQ,
    from_user: user(U_SAMAR, "Samar Rihan", "Bolt"),
    to_user: user(U_ME, "Sushan Shetty", "Pip"),
    question: "What did the backend team decide about Google Drive access, and is anything blocked on me?",
    thread_id: null,
    status: "pending",
    answer: null,
    decline_reason: null,
    created_at: iso(12),
    answered_at: null,
  },
  {
    id: PQ2,
    from_user: user(U_MAYA, "Maya Chen"),
    to_user: user(U_ME, "Sushan Shetty", "Pip"),
    question: "When is the pricing launch?",
    thread_id: null,
    status: "answered",
    answer: "1 December.",
    decline_reason: null,
    created_at: iso(60 * 26),
    answered_at: iso(60 * 25),
  },
];

export const PEER_DRAFT: StreamEvent[] = [
  { event: "step", data: { id: "d1", label: "Found the meeting", state: "running" } },
  { event: "source", data: { n: 1, kind: "decision", title: "Drop Google Drive access", text: "Calendar read only keeps us out of the security assessment.", meeting_id: MEET, decision_id: DEC } },
  { event: "source", data: { n: 2, kind: "action", title: "Reconnect Google Calendar", text: "Due Friday" } },
  { event: "step", data: { id: "d1", label: "Found the meeting", state: "done" } },
  { event: "delta", data: { text: "We dropped Google Drive access on Thursday, so Calendar is the only Google permission [1]. " } },
  { event: "delta", data: { text: "Nothing is blocked on you. I still owe the Calendar reconnect, due Friday [2]." } },
  { event: "done", data: { abstained: false, degraded: false, cited: [1, 2] } },
];

export const MEMORIES: Memory[] = [
  { id: "m-1", text: "Prefers short bullet answers", source_thread_id: null, created_at: iso(60 * 24 * 3) },
  { id: "m-2", text: "Works Tuesday to Saturday, IST", source_thread_id: null, created_at: iso(60 * 24 * 9) },
];

export const ROUTINES: Routine[] = [
  {
    id: "r-1",
    question: "What changed in pricing this week?",
    scope: null,
    cadence: "weekly",
    weekday: 0,
    hour: 9,
    timezone: "Asia/Kolkata",
    enabled: true,
    next_run_at: new Date(now + 2 * 86_400_000).toISOString(),
    last_run_at: iso(60 * 24 * 5),
    last_thread_id: "aaaaaaaa-0000-4000-8000-000000000003",
  },
  {
    id: "r-2",
    question: "What do I owe today?",
    scope: null,
    cadence: "weekdays",
    weekday: null,
    hour: 8,
    timezone: "Asia/Kolkata",
    enabled: false,
    next_run_at: null,
    last_run_at: null,
    last_thread_id: null,
  },
];

export const NUDGE_DATA: NudgeData = {
  meetings: [{ id: MEET, title: "Test", start: inMin(10).toISOString(), status: "scheduled" }],
  tasks: [
    { id: "t-1", title: "Reconnect Google Calendar", due_date: new Date(now).toISOString().slice(0, 10) },
    { id: "t-2", title: "Review pricing copy", due_date: new Date(now - 3 * 86_400_000).toISOString().slice(0, 10) },
  ],
  promises: [],
  decisions: [],
  peerQuestions: [{ id: PQ, from_name: "Samar Rihan", question: "What did the backend team decide about Google Drive access?" }],
};
