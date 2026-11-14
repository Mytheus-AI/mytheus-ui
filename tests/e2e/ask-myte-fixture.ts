/* Ask Myte test data (ADR-0047): a stored thread, the history list, starters, mentions and the
   stream bodies the mocked `/api/ask-myte` answers with. Sample people from the design contract. */

import type { Starter } from "../../src/lib/ask-myte/starters";
import type { StreamEvent, Thread, ThreadList } from "../../src/lib/ask-myte/types";
import type { Mentionable } from "../../src/lib/ask-myte/compose";

export const M = "11111111-1111-4111-8111-111111111111";
export const D = "22222222-2222-4222-8222-222222222222";
const now = new Date();
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

export const THREADS: ThreadList = {
  items: [
    { id: "aaaaaaaa-0000-4000-8000-000000000001", title: "Backend update: what we decided", pinned: true, created_at: iso(0), last_message_at: iso(0) },
    { id: "aaaaaaaa-0000-4000-8000-000000000002", title: "Prep for Test tomorrow", pinned: false, created_at: iso(0), last_message_at: iso(0) },
    { id: "aaaaaaaa-0000-4000-8000-000000000003", title: "What do I owe by Friday?", pinned: false, created_at: iso(2), last_message_at: iso(2) },
    { id: "aaaaaaaa-0000-4000-8000-000000000004", title: "Who owns the pricing page?", pinned: false, created_at: iso(20), last_message_at: iso(20) },
  ],
  next_cursor: null,
};

export const STARTERS: Starter[] = [
  { id: "prep", question: "Prep me for Test", hint: "Tomorrow, 11:00 PM" },
  { id: "owe", question: "What do I owe this week?", hint: "4 tasks, 1 promise" },
  { id: "changed", question: "What changed since Monday?", hint: "6 new decisions" },
  { id: "capacity", question: "Can I take on a Friday deadline?", hint: "Checks your capacity" },
  { id: "decided", question: "What did we decide in Feature Update - Backend?", hint: "2 decisions" },
  { id: "help", question: "How do I connect Slack?", hint: "Help" },
];

export const MENTIONS: Mentionable[] = [
  { kind: "meeting", id: M, label: "Test tomorrow", hint: null },
  { kind: "meeting", id: "33333333-3333-4333-8333-333333333333", label: "Feature Update - Backend", hint: null },
  { kind: "person", id: "44444444-4444-4444-8444-444444444444", label: "Maya Chen", hint: "maya@example.com" },
  { kind: "decision", id: D, label: "Drop Google Drive access", hint: "Feature Update - Backend" },
];

export const ANSWER_EVENTS: StreamEvent[] = [
  { event: "step", data: { id: "step-1", label: "Found the meeting", state: "running" } },
  { event: "step", data: { id: "step-2", label: "Read 2 decisions", state: "running" } },
  {
    event: "source",
    data: { n: 1, kind: "transcript", title: "Feature Update - Backend", text: "Let's drop Drive entirely. Calendar read only keeps us out of the security assessment.", meeting_id: M, meeting_title: "Feature Update - Backend", speaker: "Sushan", start_ms: 674_000 },
  },
  { event: "source", data: { n: 2, kind: "decision", title: "Meetings go live on join", text: "A meeting is live when a person joins, and ends only after it was live.", meeting_id: M, decision_id: D, occurred_at: iso(2) } },
  { event: "source", data: { n: 3, kind: "action", title: "Reconnect Google Calendar", text: "Due Friday", due_date: iso(-1).slice(0, 10) } },
  { event: "step", data: { id: "step-1", label: "Found the meeting", state: "done" } },
  { event: "step", data: { id: "step-2", label: "Read 2 decisions", state: "done" } },
  { event: "step", data: { id: "step-3", label: "Checked your tasks", state: "done" } },
  { event: "delta", data: { text: "Two decisions were confirmed on Thursday. Google Drive access is dropped, so Calendar is the only Google permission [1]. " } },
  { event: "delta", data: { text: "Meetings now go live only when someone joins [2].\n\nOne thing is on you: reconnect Google Calendar, due Friday [3]." } },
  { event: "card", data: { kind: "decision", source_ns: [2], data: { items: [], detail: { lineage: [{ content: "Read Drive attachments", role: "ancestor", recorded_at: iso(11) }] } } } },
  { event: "proposal", data: { id: "p-1", kind: "task", title: "Upload the Mytheus logo for Google verification", due_date: iso(-2).slice(0, 10) } },
  { event: "followups", data: { items: ["Who else was in that meeting?", "What's left for Google verification?", "Draft a recap for Slack"] } },
  { event: "title", data: { text: "Backend update: what we decided" } },
  { event: "done", data: { abstained: false, degraded: false, cited: [1, 2, 3] } },
  { event: "saved", data: { thread_id: "aaaaaaaa-0000-4000-8000-000000000009", message_ids: ["m-u", "m-a"] } },
];

export const sse = (events: StreamEvent[]) => events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join("");

export const THREAD: Thread = {
  ...THREADS.items[0],
  messages: [
    { id: "m-1", thread_id: THREADS.items[0].id, role: "user", content: "What did we decide in Feature Update - Backend, and is anything on me?", payload: { scope: null }, feedback: null, feedback_reason: null, created_at: iso(0) },
    {
      id: "m-2",
      thread_id: THREADS.items[0].id,
      role: "myte",
      content: "Two decisions were confirmed on Thursday. Google Drive access is dropped [1]. Meetings go live only when someone joins [2].",
      payload: {
        steps: [{ id: "step-1", label: "Found the meeting", state: "done" }],
        sources: (ANSWER_EVENTS.filter((e) => e.event === "source").map((e) => e.data) as never[]).slice(0, 2),
        cards: [],
        proposals: [],
        followups: ["Who else was in that meeting?"],
        abstained: false,
        degraded: false,
      },
      feedback: 1,
      feedback_reason: null,
      created_at: iso(0),
    },
  ],
};
