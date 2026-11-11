import type { Capacity, CapacityCheck, DateProposal, LedgerPromise, PromiseLedgerBody } from "../../src/lib/promises/ledger";
import { addDays, localIsoDate, weekStart } from "../../src/lib/promises/ledger";

/* The promise ledger as core-api would answer it, around the day the test runs: a week with one
   full day, promises from every channel, one found in Slack waiting for a yes, one date someone
   asks to move, kept ones in the side column. */

export const TODAY = localIsoDate(new Date());
const MON = weekStart(TODAY);
const at = (d: string, h = 9) => `${d}T${String(h).padStart(2, "0")}:00:00Z`;
const FRIDAY = addDays(MON, 4);
const BUSY = FRIDAY >= TODAY ? FRIDAY : addDays(TODAY, 1);

function promise(over: Partial<LedgerPromise> & Pick<LedgerPromise, "id" | "content">): LedgerPromise {
  return {
    status: "open",
    review_state: "confirmed",
    channel: "meeting",
    due_at: null,
    due_hint: null,
    recipient_user_id: null,
    recipient_name: null,
    source: { channel: "meeting", label: "Pricing review", link: "/meetings/11111111-1111-4111-8111-111111111111", external: false, quote: null, at: at(MON) },
    meeting_id: "11111111-1111-4111-8111-111111111111",
    moment_id: null,
    action_item_id: null,
    confidence: null,
    handed_off_to: null,
    handed_off_to_name: null,
    handed_off_from: null,
    created_at: at(MON),
    updated_at: at(MON),
    done_at: null,
    pending_proposal: null,
    ...over,
  };
}

const id = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;

export const LEDGER: PromiseLedgerBody = {
  pending_review: 1,
  capture: { slack_enabled: true, email_enabled: true, email_connected: false },
  items: [
    promise({ id: id(1), content: "Send Priya the revised pricing deck", due_at: BUSY, recipient_user_id: "u-priya", recipient_name: "Priya Shah" }),
    promise({
      id: id(2),
      content: "Get Acme an answer on the SSO question",
      channel: "slack",
      due_at: BUSY,
      recipient_name: "Acme",
      source: { channel: "slack", label: "Slack", link: "https://acme.slack.com/archives/C1/p1", external: true, quote: "I'll get Acme an answer on SSO by Friday", at: at(MON, 11) },
      meeting_id: null,
    }),
    promise({
      id: id(3),
      content: "Call the landlord about the lease",
      channel: "in_person",
      due_at: addDays(TODAY, -1),
      source: { channel: "in_person", label: "Hallway chat", link: "/meetings/22222222-2222-4222-8222-222222222222", external: false, quote: null, at: at(MON) },
    }),
    promise({
      id: id(4),
      content: "Review the onboarding spec",
      channel: "manual",
      due_at: addDays(TODAY, 9),
      recipient_user_id: "u-raj",
      recipient_name: "Raj Patel",
      source: { channel: "manual", label: "Added by you", link: null, external: false, quote: null, at: at(MON) },
      meeting_id: null,
      pending_proposal: { id: id(40), proposed_due: addDays(TODAY, 12), state: "pending", requester_name: "Raj Patel" },
    }),
    promise({ id: id(5), content: "Write up the Q1 hiring plan", channel: "manual", meeting_id: null, source: { channel: "manual", label: "Added by you", link: null, external: false, quote: null, at: at(MON) } }),
    promise({
      id: id(6),
      content: "Send Sam the security questionnaire",
      channel: "slack",
      review_state: "pending",
      due_at: addDays(TODAY, 2),
      recipient_user_id: "u-sam",
      recipient_name: "Sam Lee",
      confidence: 0.91,
      source: { channel: "slack", label: "Slack", link: "https://acme.slack.com/archives/C2/p2", external: true, quote: "I'll send you the questionnaire by Thursday", at: at(TODAY, 8) },
      meeting_id: null,
      created_at: at(TODAY, 8),
    }),
    promise({ id: id(7), content: "Share the launch checklist", status: "done", done_at: at(TODAY, 7) }),
    promise({ id: id(8), content: "Book the offsite room", status: "done", channel: "manual", meeting_id: null, done_at: at(addDays(TODAY, -2), 7), source: { channel: "manual", label: "Added by you", link: null, external: false, quote: null, at: null } }),
  ],
};

export const EMPTY_LEDGER: PromiseLedgerBody = { pending_review: 0, capture: LEDGER.capture, items: [] };

function day(offset: number, over: Partial<Capacity["days"][number]> = {}): Capacity["days"][number] {
  const date = addDays(MON, offset);
  const weekend = offset >= 5;
  return {
    date,
    label: date,
    promises: 0,
    actions: 0,
    items: 0,
    meeting_minutes: 0,
    focus_minutes: 0,
    away: false,
    load_minutes: 0,
    capacity_minutes: weekend ? 0 : 480,
    level: weekend ? "off" : "ok",
    ...over,
  };
}

export const CAPACITY: Capacity = {
  start: MON,
  today: TODAY,
  tz: "UTC",
  days: [
    day(0, { items: 1, promises: 1, meeting_minutes: 120, load_minutes: 180 }),
    day(1, { items: 2, actions: 2, meeting_minutes: 240, load_minutes: 360, level: "tight" }),
    day(2, { items: 1, promises: 1, meeting_minutes: 60, focus_minutes: 180, load_minutes: 120 }),
    day(3, { items: 0, meeting_minutes: 90, load_minutes: 90 }),
    day(4, { items: 6, promises: 4, actions: 2, meeting_minutes: 150, load_minutes: 510, level: "over" }),
    day(5),
    day(6),
  ],
  overdue: 1,
  undated: 1,
  calendar_synced: true,
  workday_minutes: 480,
  item_minutes: 60,
};

export const CHECK_FULL: CapacityCheck = {
  due_date: FRIDAY,
  due_label: "Friday",
  level: "over",
  items_on_day: 7,
  meeting_minutes: 150,
  warn: true,
  message: "That's your seventh promise due Friday. Offer Monday instead?",
  suggested_date: addDays(MON, 7),
  suggested_label: "Monday",
};

export const INCOMING: DateProposal[] = [
  {
    id: id(50),
    target: "commitment",
    target_id: id(51),
    content: "Send the signed contract to legal",
    current_due: addDays(TODAY, 1),
    proposed_due: addDays(TODAY, 4),
    note: "Legal needs one more day with the redlines.",
    state: "pending",
    proposer_id: "u-diego",
    proposer_name: "Diego Alvarez",
    requester_id: "u-maya",
    requester_name: "Maya Chen",
    created_at: at(TODAY, 8),
    decided_at: null,
  },
];
