/**
 * Ask Myte proposals, every kind (ADR-0047 D4, ADR-0049 F3): what each one says, what its
 * Confirm button is called, which integration it needs, and the clean shape of its fields.
 *
 * A proposal saves nothing until the person confirms it, through the same server action the rest
 * of the app uses for that write. This module only describes; it never writes.
 *
 * Pure (no imports but the types), tested in tests/ask-myte-proposals.test.ts.
 */

import { PROPOSAL_KINDS, type ExportDestination, type ProposalEvent, type ProposalKind } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DESTINATIONS: readonly ExportDestination[] = ["notion", "confluence", "slack"];

export const DESTINATION_NAME: Record<ExportDestination, string> = { notion: "Notion", confluence: "Confluence", slack: "Slack" };

export function isProposalKind(v: unknown): v is ProposalKind {
  return typeof v === "string" && (PROPOSAL_KINDS as readonly string[]).includes(v);
}

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const ids = (v: unknown, max = 20): string[] => (Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === "string" && UUID.test(x)))).slice(0, max) : []);
/** A names array kept parallel to its ids array (same length, "" where unknown). */
const namesFor = (rawIds: unknown, rawNames: unknown, kept: string[]): string[] => {
  const idList = Array.isArray(rawIds) ? rawIds : [];
  const names = Array.isArray(rawNames) ? rawNames : [];
  return kept.map((id) => {
    const at = idList.indexOf(id);
    const n = at >= 0 ? names[at] : null;
    return typeof n === "string" ? n.trim().slice(0, 120) : "";
  });
};
const isoOrNull = (v: unknown): string | null => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);

/**
 * A proposal event as the UI can trust it: an unknown kind is null (nothing to render), ids that
 * are not uuids are dropped, names stay parallel to their ids, a Slack channel is "#name".
 */
export function normalizeProposal(raw: unknown): ProposalEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || !p.id || !isProposalKind(p.kind)) return null;
  const base: ProposalEvent = { id: p.id, kind: p.kind, title: str(p.title, 200) ?? "" };
  const note = str(p.note, 2000);
  if (note) base.note = note;
  switch (p.kind) {
    case "task":
    case "promise":
      return { ...base, due_date: typeof p.due_date === "string" && /^\d{4}-\d{2}-\d{2}/.test(p.due_date) ? p.due_date.slice(0, 10) : null };
    case "attendance":
      return { ...base, meeting_id: str(p.meeting_id, 64), choice: p.choice === "attend" || p.choice === "skip" ? p.choice : "agent" };
    case "agenda_item":
      return { ...base, meeting_id: str(p.meeting_id, 64) };
    case "schedule_meeting": {
      const attendees = ids(p.attendee_ids);
      return { ...base, start: isoOrNull(p.start), end: isoOrNull(p.end), attendee_ids: attendees, attendee_names: namesFor(p.attendee_ids, p.attendee_names, attendees) };
    }
    case "invite_people": {
      const users = ids(p.user_ids);
      return { ...base, meeting_id: str(p.meeting_id, 64), user_ids: users, user_names: namesFor(p.user_ids, p.user_names, users) };
    }
    case "slack_post": {
      const ch = str(p.channel, 80);
      return { ...base, text: str(p.text, 4000) ?? "", channel: ch ? `#${ch.replace(/^#+/, "").toLowerCase()}` : null };
    }
    case "export_decisions":
      return {
        ...base,
        destination: DESTINATIONS.includes(p.destination as ExportDestination) ? (p.destination as ExportDestination) : "notion",
        meeting_id: str(p.meeting_id, 64),
        decision_ids: ids(p.decision_ids, 50),
      };
    case "share_decision":
      return { ...base, decision_id: str(p.decision_id, 64), meeting_id: str(p.meeting_id, 64) };
    case "ask_myte":
      return { ...base, person_id: str(p.person_id, 64), person_name: str(p.person_name, 120) ?? "", question: str(p.question, 1000) ?? "" };
    case "memory":
      return { ...base, text: str(p.text, 300) ?? str(p.title, 300) ?? "" };
    default:
      return null;
  }
}

/* ---------------- words ---------------- */

/** "Maya", "Maya and Raj", "Maya, Raj and 2 others". */
export function peopleWords(names: readonly string[], unknownCount = 0): string {
  const known = names.filter((n) => n.trim());
  const extra = unknownCount + (names.length - known.length);
  const shown = known.slice(0, 2);
  const rest = known.length - shown.length + extra;
  if (shown.length === 0) return rest === 1 ? "1 person" : `${rest} people`;
  if (rest === 0) return shown.length === 1 ? shown[0] : `${shown[0]} and ${shown[1]}`;
  return `${shown.join(", ")} and ${rest} other${rest === 1 ? "" : "s"}`;
}

const dueWords = (due: string | null | undefined): string | null => {
  if (!due || !/^\d{4}-\d{2}-\d{2}/.test(due)) return null;
  const d = new Date(`${due.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(d);
};

/** "Tue, Nov 18, 10:00 to 10:30" in the viewer's zone (or the one given, for tests). */
export function slotWords(start: string | null | undefined, end: string | null | undefined, timeZone?: string): string | null {
  if (!start) return null;
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return null;
  const day = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone }).format(s);
  const t = (d: Date) => new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(d);
  const e = end ? new Date(end) : null;
  return e && !Number.isNaN(e.getTime()) ? `${day}, ${t(s)} to ${t(e)}` : `${day}, ${t(s)}`;
}

/** One plain sentence for the card (and the confirmed line, and screen readers). */
export function proposalSummary(p: ProposalEvent, timeZone?: string): string {
  const due = dueWords(p.due_date);
  const tail = due ? `, due ${due}` : "";
  switch (p.kind) {
    case "task":
      return `Add a task: "${p.title}"${tail}`;
    case "promise":
      return `Add a promise: "${p.title}"${tail}`;
    case "agenda_item":
      return `Add to the agenda: "${p.title}"`;
    case "attendance":
      return p.choice === "attend" ? `Attend yourself: ${p.title}` : p.choice === "skip" ? `Skip: ${p.title}` : `Send your Myte instead: ${p.title}`;
    case "schedule_meeting": {
      const when = slotWords(p.start, p.end, timeZone);
      const who = p.attendee_ids?.length ? ` with ${peopleWords(p.attendee_names ?? [])}` : "";
      return `Schedule "${p.title}"${when ? `, ${when}` : ""}${who}`;
    }
    case "invite_people":
      return `Invite ${peopleWords(p.user_names ?? [], Math.max(0, (p.user_ids?.length ?? 0) - (p.user_names?.length ?? 0)))} to the meeting`;
    case "slack_post":
      return p.channel ? `Post to Slack in ${p.channel}` : "Post to Slack";
    case "export_decisions": {
      const n = p.decision_ids?.length ?? 0;
      const what = n === 1 ? "1 decision" : n > 1 ? `${n} decisions` : "this meeting's decisions";
      return `Export ${what} to ${DESTINATION_NAME[p.destination ?? "notion"]}`;
    }
    case "share_decision":
      return `Make a share link: ${p.title.replace(/^Share:\s*/i, "")}`;
    case "ask_myte":
      return `Ask ${p.person_name ? `${p.person_name}'s` : "a teammate's"} Myte`;
    case "memory":
      return `Remember: ${p.text || p.title.replace(/^Remember:\s*/i, "")}`;
    default:
      return p.title;
  }
}

/** The Confirm button's words: exactly what happens. */
export const CONFIRM_LABEL: Record<ProposalKind, string> = {
  task: "Add task",
  promise: "Add promise",
  agenda_item: "Add to agenda",
  attendance: "Confirm",
  schedule_meeting: "Schedule meeting",
  invite_people: "Send invites",
  slack_post: "Post to Slack",
  export_decisions: "Export",
  share_decision: "Create link",
  ask_myte: "Send question",
  memory: "Remember this",
};

/** The short heading on each card ("Myte suggests" for v1 kinds). */
export const KIND_LABEL: Record<ProposalKind, string> = {
  task: "A task for you",
  promise: "A promise to keep",
  agenda_item: "For the agenda",
  attendance: "Your attendance",
  schedule_meeting: "A new meeting",
  invite_people: "Invitations",
  slack_post: "A Slack message",
  export_decisions: "An export",
  share_decision: "A share link",
  ask_myte: "A question for a teammate's Myte",
  memory: "Something to remember",
};

/** The integration a kind needs before it can be confirmed, if any. */
export function integrationFor(p: Pick<ProposalEvent, "kind" | "destination">): ExportDestination | null {
  if (p.kind === "slack_post") return "slack";
  if (p.kind === "export_decisions") return p.destination ?? "notion";
  return null;
}

/** Whether Confirm can be pressed with these fields, and if not, why (shown under the button). */
export function proposalProblem(p: ProposalEvent): string | null {
  switch (p.kind) {
    case "task":
    case "promise":
    case "agenda_item":
      return p.title.trim() ? null : "Give it a title.";
    case "schedule_meeting": {
      if (!p.title.trim()) return "Give the meeting a title.";
      if (!p.start || Number.isNaN(Date.parse(p.start))) return "Pick a start time.";
      if (!p.end || Date.parse(p.end) <= Date.parse(p.start)) return "The meeting has to end after it starts.";
      return null;
    }
    case "invite_people":
      if (!p.meeting_id) return "I don't know which meeting this is for any more.";
      return p.user_ids?.length ? null : "Pick at least one person.";
    case "slack_post":
      return p.text?.trim() ? null : "Write the message first.";
    case "export_decisions":
      return p.meeting_id || p.decision_ids?.length ? null : "I don't know which decisions to export any more.";
    case "share_decision":
      return p.decision_id ? null : "I don't know which decision this is any more.";
    case "ask_myte":
      if (!p.person_id) return "Pick who to ask.";
      return p.question?.trim() ? null : "Write the question first.";
    case "memory":
      return p.text?.trim() ? null : "Write what I should remember.";
    default:
      return null;
  }
}

/* ---------------- meeting times ---------------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** An ISO instant as the date and time inputs show it, in the browser's own zone. */
export function isoToInputs(iso: string | null | undefined): { date: string; time: string } {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return { date: "", time: "" };
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** The date and time inputs back to an ISO instant with the browser's offset, or null. */
export function inputsToIso(date: string, time: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m || !t) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]));
  if (Number.isNaN(d.getTime())) return null;
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${m[1]}-${m[2]}-${m[3]}T${t[1]}:${t[2]}:00${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

/** Whole minutes from start to end, clamped to what a meeting may be (5 to 480). */
export function minutesBetween(start: string | null | undefined, end: string | null | undefined): number {
  const s = start ? Date.parse(start) : NaN;
  const e = end ? Date.parse(end) : NaN;
  if (Number.isNaN(s) || Number.isNaN(e)) return 30;
  return Math.min(480, Math.max(5, Math.round((e - s) / 60_000)));
}
