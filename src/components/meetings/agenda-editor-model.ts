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
    if (r.id) item.id = r.id;
    items.push(item);
  }

  if (Object.keys(errors).length > 0) return { ok: false, message: AGENDA_MESSAGES.summary, rows: errors };
  return { ok: true, items };
}
