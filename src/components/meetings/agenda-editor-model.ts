/**
 * The agenda editor's rows and their validation (mytheus-docs ADR-0038 D5, D6), shared by the
 * New meeting dialog and the meeting page's Edit agenda. Pure, so the rules are unit tested and
 * the messages match the server's limits word for word.
 *
 * Limits: at most 20 items; a title of 1 to 200 characters; minutes optional, a whole number from
 * 1 to 240; an owner optional, and when set someone in the meeting. A row left completely empty
 * is ignored rather than refused.
 */

import { AGENDA_LIMITS, type AgendaItem, type AgendaItemPut } from "../../lib/api/meeting-agenda-types.ts";
import type { DraftSource, DraftedAgendaItem, MeetingTemplate } from "../../lib/api/meeting-brain-types.ts";

export interface AgendaDraftRow {
  /** Stable React key for the row, also the error key. */
  key: string;
  /** An existing item's id (editing): keeps its status on save. */
  id?: string;
  title: string;
  /** Internal user id, or "" for no owner. */
  ownerId: string;
  /** As typed: "" for no time box. */
  minutes: string;
  /** An org goal id (ADR-0039 B3), or "" for none. */
  goalId?: string;
  /** Where a drafted row came from (ADR-0039 B4), shown quietly. Unset for rows you wrote, and
   *  cleared when you retitle a drafted one. */
  source?: DraftSource;
}

export type AgendaRowErrors = Partial<Record<"title" | "minutes" | "owner", string>>;

export type AgendaValidation =
  | { ok: true; items: AgendaItemPut[] }
  | { ok: false; message: string; rows: Record<string, AgendaRowErrors> };

export const AGENDA_MESSAGES = {
  tooMany: `An agenda can have at most ${AGENDA_LIMITS.maxItems} items.`,
  titleMissing: "Give this item a title.",
  titleTooLong: `Keep the title to ${AGENDA_LIMITS.titleMax} characters.`,
  minutes: `Minutes must be a whole number from ${AGENDA_LIMITS.minutesMin} to ${AGENDA_LIMITS.minutesMax}.`,
  owner: "The owner must be someone in this meeting.",
  summary: "Fix the highlighted agenda items.",
} as const;

let seq = 0;
/** A fresh row key. */
export function newRowKey(): string {
  seq += 1;
  return `row-${Date.now().toString(36)}-${seq}`;
}

export function emptyRow(): AgendaDraftRow {
  return { key: newRowKey(), title: "", ownerId: "", minutes: "" };
}

/** Rows for editing an existing agenda. */
export function rowsFromItems(items: AgendaItem[]): AgendaDraftRow[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((it) => ({
      key: it.id,
      id: it.id,
      title: it.title,
      ownerId: it.owner_user_id ?? "",
      minutes: it.duration_minutes == null ? "" : String(it.duration_minutes),
      goalId: it.goal_id ?? "",
    }));
}

function isBlank(r: AgendaDraftRow): boolean {
  return !r.title.trim() && !r.minutes.trim() && !r.ownerId && !r.id;
}

/** Whether another row may be added. */
export function canAddRow(rows: AgendaDraftRow[]): boolean {
  return rows.length < AGENDA_LIMITS.maxItems;
}

export function addRow(rows: AgendaDraftRow[]): AgendaDraftRow[] {
  return canAddRow(rows) ? [...rows, emptyRow()] : rows;
}

export function removeRow(rows: AgendaDraftRow[], key: string): AgendaDraftRow[] {
  return rows.filter((r) => r.key !== key);
}

/** Move a row one place up (-1) or down (+1). Out of range is a no-op. */
export function moveRow(rows: AgendaDraftRow[], key: string, dir: -1 | 1): AgendaDraftRow[] {
  const i = rows.findIndex((r) => r.key === key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return rows;
  const next = [...rows];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function updateRow(rows: AgendaDraftRow[], key: string, patch: Partial<Omit<AgendaDraftRow, "key">>): AgendaDraftRow[] {
  return rows.map((r) => (r.key === key ? { ...r, ...patch } : r));
}

/** Minutes the agenda's time boxes add up to (rows without minutes count nothing). */
export function plannedMinutes(rows: AgendaDraftRow[]): number {
  return rows.reduce((n, r) => {
    const m = Number(r.minutes);
    return Number.isInteger(m) && m > 0 ? n + m : n;
  }, 0);
}

/**
 * Validate rows against D5/D6. `participantIds` are the people who will be in the meeting (the
 * host included); an owner outside them is refused, as the server would.
 */
export function validateAgenda(rows: AgendaDraftRow[], participantIds: readonly string[]): AgendaValidation {
  const kept = rows.filter((r) => !isBlank(r));
  if (kept.length > AGENDA_LIMITS.maxItems) return { ok: false, message: AGENDA_MESSAGES.tooMany, rows: {} };

  const allowed = new Set(participantIds);
  const errors: Record<string, AgendaRowErrors> = {};
  const items: AgendaItemPut[] = [];

  for (const r of kept) {
    const e: AgendaRowErrors = {};
    const title = r.title.trim();
    if (!title) e.title = AGENDA_MESSAGES.titleMissing;
    else if (title.length > AGENDA_LIMITS.titleMax) e.title = AGENDA_MESSAGES.titleTooLong;

    let minutes: number | null = null;
    const typed = r.minutes.trim();
    if (typed) {
      const m = Number(typed);
      if (!/^\d+$/.test(typed) || !Number.isInteger(m) || m < AGENDA_LIMITS.minutesMin || m > AGENDA_LIMITS.minutesMax) {
        e.minutes = AGENDA_MESSAGES.minutes;
      } else {
        minutes = m;
      }
    }

    if (r.ownerId && !allowed.has(r.ownerId)) e.owner = AGENDA_MESSAGES.owner;

    if (Object.keys(e).length > 0) {
      errors[r.key] = e;
      continue;
    }
    const item: AgendaItemPut = { title, owner_user_id: r.ownerId || null, duration_minutes: minutes };
    if (r.goalId) item.goal_id = r.goalId;
    if (r.id) item.id = r.id;
    items.push(item);
  }

  if (Object.keys(errors).length > 0) return { ok: false, message: AGENDA_MESSAGES.summary, rows: errors };
  return { ok: true, items };
}

/* ---------------------------------------------------------------- drafted agendas (ADR-0039 B1, B4) */

export const DRAFT_SOURCE_LABEL: Record<DraftSource, string> = {
  template: "From the meeting type",
  unfinished: "Not finished last time",
  open_action: "Open action from last time",
};

function sameTitle(a: string, b: string): boolean {
  return a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Rows for drafted items, in the server's order. */
export function rowsFromDraft(items: readonly DraftedAgendaItem[]): AgendaDraftRow[] {
  return items.map((it) => ({
    key: newRowKey(),
    title: it.title.slice(0, AGENDA_LIMITS.titleMax),
    ownerId: it.owner_user_id ?? "",
    minutes: it.duration_minutes == null ? "" : String(it.duration_minutes),
    goalId: it.goal_id ?? "",
    source: it.source,
  }));
}

/** A meeting type's agenda as drafted rows. */
export function templateDraft(template: Pick<MeetingTemplate, "agenda">): DraftedAgendaItem[] {
  return template.agenda.map((a) => ({
    title: a.title,
    owner_user_id: null,
    duration_minutes: a.duration_minutes ?? null,
    goal_id: null,
    source: "template" as const,
  }));
}

export interface DraftMerge {
  rows: AgendaDraftRow[];
  /** Drafted rows that made it in. */
  added: number;
  /** Drafted rows left out because the agenda would pass 20 items. */
  dropped: number;
}

/**
 * Fold drafted items into the rows being edited. Earlier drafted rows whose source is in
 * `replace` give way to the new draft; rows you wrote yourself (and drafted rows of other
 * sources) are always kept. Drafted rows go first, in the server's order, then the kept rows. A
 * drafted item with the same title as a kept row is skipped. Your rows are never pushed out by
 * the 20-item cap: drafted rows are trimmed from the end instead.
 */
export function mergeDraftedAgenda(
  rows: readonly AgendaDraftRow[],
  drafted: readonly DraftedAgendaItem[],
  replace: readonly DraftSource[] = ["template", "unfinished", "open_action"],
): DraftMerge {
  const kept = rows.filter((r) => !(r.source && replace.includes(r.source)) && !isBlank(r));
  const fresh = rowsFromDraft(drafted).filter((d) => !kept.some((k) => sameTitle(k.title, d.title)));
  // Drop duplicates inside the draft itself too (the same title twice).
  const unique: AgendaDraftRow[] = [];
  for (const d of fresh) if (!unique.some((u) => sameTitle(u.title, d.title))) unique.push(d);
  const room = Math.max(0, AGENDA_LIMITS.maxItems - kept.length);
  const added = unique.slice(0, room);
  return { rows: [...added, ...kept], added: added.length, dropped: unique.length - added.length };
}

/** Retitling a drafted row makes it yours: its source caption goes. */
export function retitleRow(rows: AgendaDraftRow[], key: string, title: string): AgendaDraftRow[] {
  return rows.map((r) => (r.key === key ? { ...r, title, source: undefined } : r));
}
