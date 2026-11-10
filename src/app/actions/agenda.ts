"use server";

import { api, ApiError } from "@/lib/api/client";
import {
  AGENDA_LIMITS,
  AGENDA_STATUSES,
  type AgendaItem,
  type AgendaItemPut,
  type AgendaStatus,
} from "@/lib/api/meeting-agenda-types";

/* Writes to a meeting's agenda (mytheus-docs ADR-0038 D6), host or creator only; core-api
   enforces that and the tenant. Nothing about the tenant or the user is taken from the input.
   `api()` attaches the session token and an Idempotency-Key.

   - `replaceAgenda`: `PUT /api/v1/meetings/{id}/agenda`. Items sent with an id keep their status;
     new ones start pending; items left out are deleted.
   - `setAgendaItemStatus`: `PATCH /api/v1/meetings/{id}/agenda/{item_id}`, which records the
     host as the source, so the MeetingAgent never overrides it. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AgendaWriteFailure = { ok: false; message: string; gone?: boolean };
export type ReplaceAgendaResult = { ok: true; items: AgendaItem[] } | AgendaWriteFailure;
export type AgendaStatusResult = { ok: true; item: AgendaItem } | AgendaWriteFailure;

function failure(err: unknown, verb: "save the agenda" | "update this item"): AgendaWriteFailure {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 403) return { ok: false, message: "Only the host or the person who created this meeting can change its agenda." };
    if (err.status === 404) return { ok: false, message: "That agenda item is no longer here.", gone: true };
    if (err.status === 409) return { ok: false, message: "This meeting has ended, so its agenda can't change." };
    if (err.status === 422) return { ok: false, message: "Some agenda details weren't accepted. Check the titles, owners and minutes." };
  }
  return { ok: false, message: `Couldn't ${verb} just now. Try again in a moment.` };
}

function cleanItems(items: AgendaItemPut[]): AgendaItemPut[] | null {
  if (!Array.isArray(items) || items.length > AGENDA_LIMITS.maxItems) return null;
  const out: AgendaItemPut[] = [];
  for (const it of items) {
    const title = typeof it?.title === "string" ? it.title.trim() : "";
    if (!title || title.length > AGENDA_LIMITS.titleMax) return null;
    const minutes = it.duration_minutes ?? null;
    if (
      minutes !== null &&
      (!Number.isInteger(minutes) || minutes < AGENDA_LIMITS.minutesMin || minutes > AGENDA_LIMITS.minutesMax)
    )
      return null;
    const owner = it.owner_user_id && UUID.test(it.owner_user_id) ? it.owner_user_id : null;
    const row: AgendaItemPut = { title, owner_user_id: owner, duration_minutes: minutes };
    if (it.id && UUID.test(it.id)) row.id = it.id;
    out.push(row);
  }
  return out;
}

export async function replaceAgenda(meetingId: string, items: AgendaItemPut[]): Promise<ReplaceAgendaResult> {
  if (!UUID.test(meetingId)) return { ok: false, message: "That meeting no longer exists.", gone: true };
  const clean = cleanItems(items);
  if (!clean) return { ok: false, message: "Some agenda details weren't accepted. Check the titles, owners and minutes." };
  try {
    const saved = await api<AgendaItem[]>(`/api/v1/meetings/${meetingId}/agenda`, {
      method: "PUT",
      body: { items: clean },
    });
    return { ok: true, items: Array.isArray(saved) ? saved : [] };
  } catch (err) {
    return failure(err, "save the agenda");
  }
}

export async function setAgendaItemStatus(
  meetingId: string,
  itemId: string,
  status: AgendaStatus,
): Promise<AgendaStatusResult> {
  if (!UUID.test(meetingId) || !UUID.test(itemId)) return { ok: false, message: "That agenda item is no longer here.", gone: true };
  if (!AGENDA_STATUSES.includes(status)) return { ok: false, message: "That status isn't one an agenda item can have." };
  try {
    const item = await api<AgendaItem>(`/api/v1/meetings/${meetingId}/agenda/${itemId}`, {
      method: "PATCH",
      body: { status },
    });
    return { ok: true, item };
  } catch (err) {
    return failure(err, "update this item");
  }
}
