/**
 * Ask Myte's rich cards (ADR-0047 D4 `show_card`): what each card shows, read from the event.
 * `card.data.items` are the cited source objects (always sent); `card.data.detail` is bff's raw
 * MCP tool result passed through as-is (null for task and promise cards, and over 32 KB):
 *
 * - meeting: `get_meeting_outcome` {id, title, status, scheduled_start, host_name, agenda[],
 *   decisions[], actions[]}, or one `list_my_schedule` item {id, title, start, end, host_name,
 *   attendee_count, attendance, live, hosting}.
 * - decision: `get_decision_record` {id, content, status, rationale, meeting_title,
 *   lineage: [{relation, visible, content, status}], meeting_actions[]}. A lineage entry with
 *   `visible: false` is from a meeting the asker was not in: it is shown only as that fact,
 *   its content never.
 * - capacity: `check_my_capacity`, for a date {message, level, items_on_day, due_label,
 *   meeting_minutes, suggested_date, suggested_label} or for the week {days: [{date, label,
 *   items, meeting_minutes, focus_minutes, away, level}], overdue, calendar_synced}.
 *
 * Every field is read defensively: a card shows what it has. Pure, tested in
 * tests/ask-myte-cards.test.ts.
 */

import type { Source } from "./types.ts";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const recs = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(isRec) : []);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ---------------- meeting ---------------- */

export interface MeetingCardView {
  id: string | null;
  title: string;
  start: string | null;
  end: string | null;
  host: string | null;
  hosting: boolean;
  attendees: number | null;
  live: boolean;
  /** "agent" when the asker sends their Myte */
  attendance: string | null;
  agenda: { title: string; status: string | null }[];
  decisions: string[];
  actions: { content: string; owner: string | null; due: string | null; status: string | null }[];
}

export function meetingView(detail: unknown, items: readonly Source[]): MeetingCardView {
  const d = isRec(detail) ? detail : {};
  const first = items[0];
  const id = str(d.id) ?? first?.meeting_id ?? null;
  return {
    id: id && UUID.test(id) ? id : null,
    title: str(d.title) ?? first?.meeting_title ?? first?.title ?? "Meeting",
    start: str(d.scheduled_start) ?? str(d.start) ?? first?.occurred_at ?? null,
    end: str(d.end) ?? str(d.scheduled_end) ?? null,
    host: str(d.host_name),
    hosting: d.hosting === true,
    attendees: num(d.attendee_count),
    live: d.live === true || d.status === "live",
    attendance: str(d.attendance),
    agenda: recs(d.agenda)
      .map((a) => ({ title: str(a.title) ?? "", status: str(a.status) }))
      .filter((a) => a.title),
    decisions: recs(d.decisions)
      .map((x) => str(x.content) ?? "")
      .filter(Boolean),
    actions: recs(d.actions)
      .map((x) => ({ content: str(x.content) ?? "", owner: str(x.owner_name), due: str(x.due_date), status: str(x.status) }))
      .filter((x) => x.content),
  };
}

/* ---------------- decision ---------------- */

export interface LineageEntry {
  /** null for a decision from a meeting the asker was not in: its content is never shown */
  content: string | null;
  relation: string;
  status: string | null;
}

export interface DecisionCardView {
  id: string | null;
  content: string;
  status: string | null;
  rationale: string | null;
  meetingTitle: string | null;
  lineage: LineageEntry[];
}

/** How a lineage entry relates to the decision, in plain words. */
export function relationWords(relation: string): string {
  const r = relation.toLowerCase();
  if (r === "supersedes" || r === "replaces" || r === "ancestor" || r === "follows_from" || r === "parent") return "Replaces";
  if (r === "superseded_by" || r === "replaced_by" || r === "descendant" || r === "child") return "Replaced by";
  const words = r.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Related";
}

export function decisionView(detail: unknown, items: readonly Source[]): DecisionCardView {
  const d = isRec(detail) ? detail : {};
  const first = items[0];
  const lineage: LineageEntry[] = recs(d.lineage)
    .filter((l) => str(l.relation) !== "subject")
    // A visible entry with no words says nothing; a hidden one is still worth its one line.
    .filter((l) => l.visible === false || str(l.content) !== null)
    .map((l) => ({
      // Hidden entries carry no words at all, whatever the server put in them.
      content: l.visible === false ? null : str(l.content),
      relation: str(l.relation) ?? "related",
      status: l.visible === false ? null : str(l.status),
    }));
  return {
    id: str(d.id) ?? first?.decision_id ?? null,
    content: str(d.content) ?? first?.text ?? first?.title ?? "",
    status: str(d.status) ?? first?.status ?? null,
    rationale: str(d.rationale),
    meetingTitle: str(d.meeting_title) ?? first?.meeting_title ?? null,
    lineage,
  };
}

/* ---------------- capacity ---------------- */

export type Load = "light" | "ok" | "busy" | "full" | "away" | "unknown";

/** A capacity level, whatever bff calls it, as one of a few loads the card can colour. */
export function loadOf(level: unknown, away = false): Load {
  if (away) return "away";
  const l = typeof level === "string" ? level.toLowerCase() : "";
  if (!l) return "unknown";
  if (/(over|full|red|high|heavy|overload|no_room|at_capacity)/.test(l)) return "full";
  if (/(busy|tight|amber|medium|moderate|warn)/.test(l)) return "busy";
  if (/(light|free|low|green|open|room)/.test(l)) return "light";
  return "ok";
}

export type CapacityView =
  | {
      shape: "day";
      message: string | null;
      load: Load;
      itemsOnDay: number | null;
      dueLabel: string | null;
      meetingMinutes: number | null;
      suggestedLabel: string | null;
    }
  | {
      shape: "week";
      days: { label: string; items: number; meetingMinutes: number | null; load: Load }[];
      overdue: number | null;
      calendarSynced: boolean | null;
    }
  | { shape: "none"; text: string | null };

export function capacityView(detail: unknown, items: readonly Source[]): CapacityView {
  const d = isRec(detail) ? detail : null;
  if (d && Array.isArray(d.days)) {
    return {
      shape: "week",
      days: recs(d.days).map((x) => ({
        label: str(x.label) ?? str(x.date) ?? "",
        items: num(x.items) ?? 0,
        meetingMinutes: num(x.meeting_minutes),
        load: loadOf(x.level, x.away === true),
      })),
      overdue: num(d.overdue),
      calendarSynced: typeof d.calendar_synced === "boolean" ? d.calendar_synced : null,
    };
  }
  if (d && (str(d.message) || d.level !== undefined)) {
    return {
      shape: "day",
      message: str(d.message),
      load: loadOf(d.level),
      itemsOnDay: num(d.items_on_day),
      dueLabel: str(d.due_label),
      meetingMinutes: num(d.meeting_minutes),
      suggestedLabel: str(d.suggested_label),
    };
  }
  return { shape: "none", text: items[0]?.text?.trim() || null };
}

/** "2 h 30 min" or "45 min". */
export function minutesWords(m: number | null): string | null {
  if (m === null || m <= 0) return null;
  const h = Math.floor(m / 60);
  const rest = Math.round(m % 60);
  return h ? (rest ? `${h} h ${rest} min` : `${h} h`) : `${rest} min`;
}
