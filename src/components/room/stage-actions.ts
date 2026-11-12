"use server";

import { api, ApiError } from "@/lib/api/client";
import type { AgendaItem } from "@/lib/api/meeting-agenda-types";
import type {
  AgendaAdvancedWire,
  CatchUpSummaryWire,
  StandInAnswerWire,
  WrapUpClosedWire,
  WrapUpWire,
} from "@/lib/api/room-stage-types";

/* The room's top chrome against core-api (polish program, Phase 1). Server actions, because
   `lib/api/client.ts` is server-only (it reads the Clerk session) and the room is a client island.
   Nothing about the tenant or the user is taken from the input: `api()` forwards the caller's own
   session, and core-api decides what they may see and do (host-only writes are 403 for anyone
   else, another tenant's meeting is 404).

   - `advanceAgenda`     POST /meetings/{id}/agenda/advance ("Start next").
   - `extendAgendaItem`  PATCH /meetings/{id}/agenda/{item_id} with `extend_minutes`.
   - `loadWrapUp`, `startWrapUp`, `cancelWrapUp`, `closeMeeting`: the close-out ritual.
   - `assignActionCard`  PATCH /actions/{id} with `assignee_id` (a proposed card only).
   - `loadCatchUp`       GET /meetings/{id}/catch-up-summary, for a late joiner.
   - `askStandIn`        POST /meetings/{id}/stand-ins/{user_id}/ask. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fail = { ok: false; message: string; status?: number };

function fail(err: unknown, what: string, verb: string): Fail {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again.", status: err.status };
    if (err.status === 403) return { ok: false, message: `Only the host can ${verb}.`, status: 403 };
    if (err.status === 404) return { ok: false, message: `That ${what} is no longer here.`, status: 404 };
    if (err.status === 409) return { ok: false, message: "This meeting has already ended.", status: 409 };
    if (err.status === 422) return { ok: false, message: "That wasn't accepted. Check it and try again.", status: 422 };
  }
  return { ok: false, message: `Couldn't ${verb} just now. Try again in a moment.`, status: err instanceof ApiError ? err.status : 0 };
}

const badId: Fail = { ok: false, message: "That meeting link is not valid.", status: 400 };

export type AdvanceResult = { ok: true; items: AgendaItem[]; current: AgendaItem | null } | Fail;

export async function advanceAgenda(meetingId: string, outcome: "covered" | "skipped" = "covered"): Promise<AdvanceResult> {
  if (!UUID.test(meetingId)) return badId;
  try {
    const body = await api<AgendaAdvancedWire>(`/api/v1/meetings/${meetingId}/agenda/advance`, {
      method: "POST",
      body: { outcome },
    });
    return { ok: true, items: (body.items ?? []) as AgendaItem[], current: (body.current ?? null) as AgendaItem | null };
  } catch (err) {
    return fail(err, "agenda item", "move the agenda on");
  }
}

export type ExtendResult = { ok: true; item: AgendaItem } | Fail;

export async function extendAgendaItem(meetingId: string, itemId: string, minutes: number): Promise<ExtendResult> {
  if (!UUID.test(meetingId) || !UUID.test(itemId)) return badId;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) return { ok: false, message: "Extend by 1 to 60 minutes." };
  try {
    const item = await api<AgendaItem>(`/api/v1/meetings/${meetingId}/agenda/${itemId}`, {
      method: "PATCH",
      body: { extend_minutes: minutes },
    });
    return { ok: true, item };
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      return { ok: false, message: "An item can be extended by four hours at most.", status: 422 };
    }
    return fail(err, "agenda item", "extend this item");
  }
}

export type WrapUpResult = { ok: true; wrapUp: WrapUpWire } | Fail;

export async function loadWrapUp(meetingId: string): Promise<WrapUpResult> {
  if (!UUID.test(meetingId)) return badId;
  try {
    return { ok: true, wrapUp: await api<WrapUpWire>(`/api/v1/meetings/${meetingId}/wrap-up`) };
  } catch (err) {
    return fail(err, "meeting", "load what is left");
  }
}

export async function startWrapUp(meetingId: string): Promise<WrapUpResult> {
  if (!UUID.test(meetingId)) return badId;
  try {
    const wrapUp = await api<WrapUpWire>(`/api/v1/meetings/${meetingId}/wrap-up/start`, { method: "POST", body: {} });
    return { ok: true, wrapUp };
  } catch (err) {
    return fail(err, "meeting", "end the meeting for everyone");
  }
}

export async function cancelWrapUp(meetingId: string): Promise<WrapUpResult> {
  if (!UUID.test(meetingId)) return badId;
  try {
    const wrapUp = await api<WrapUpWire>(`/api/v1/meetings/${meetingId}/wrap-up/cancel`, { method: "POST", body: {} });
    return { ok: true, wrapUp };
  } catch (err) {
    return fail(err, "meeting", "keep the meeting going");
  }
}

export type CloseResult = { ok: true; closed: WrapUpClosedWire } | Fail;

export async function closeMeeting(
  meetingId: string,
  ownerUserId: string | null,
  reason: "host" | "timer",
): Promise<CloseResult> {
  if (!UUID.test(meetingId)) return badId;
  const body: Record<string, unknown> = { reason };
  if (ownerUserId && UUID.test(ownerUserId)) body.owner_user_id = ownerUserId;
  try {
    const closed = await api<WrapUpClosedWire>(`/api/v1/meetings/${meetingId}/wrap-up/close`, { method: "POST", body });
    return { ok: true, closed };
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      return { ok: false, message: "The person who reviews the leftovers must be in this meeting.", status: 422 };
    }
    return fail(err, "meeting", "end the meeting for everyone");
  }
}

export type AssignResult = { ok: true; assigneeId: string | null } | Fail;

export async function assignActionCard(actionId: string, assigneeId: string): Promise<AssignResult> {
  if (!UUID.test(actionId) || !UUID.test(assigneeId)) return { ok: false, message: "Pick someone from this meeting." };
  try {
    const row = await api<{ assignee_id?: string | null }>(`/api/v1/actions/${actionId}`, {
      method: "PATCH",
      body: { assignee_id: assigneeId },
    });
    return { ok: true, assigneeId: row.assignee_id ?? null };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { ok: false, message: "Someone already settled this task.", status: 409 };
    }
    return fail(err, "task", "assign this task");
  }
}

export type CatchUpResult = { ok: true; summary: CatchUpSummaryWire } | Fail;

export async function loadCatchUp(meetingId: string): Promise<CatchUpResult> {
  if (!UUID.test(meetingId)) return badId;
  try {
    return { ok: true, summary: await api<CatchUpSummaryWire>(`/api/v1/meetings/${meetingId}/catch-up-summary`) };
  } catch (err) {
    return fail(err, "meeting", "load what you missed");
  }
}

export type AskStandInResult = { ok: true; answer: StandInAnswerWire } | Fail;

export async function askStandIn(meetingId: string, userId: string, question: string): Promise<AskStandInResult> {
  if (!UUID.test(meetingId) || !UUID.test(userId)) return badId;
  const q = question.trim().replace(/\s+/g, " ");
  if (!q) return { ok: false, message: "Type a question first." };
  if (q.length > 300) return { ok: false, message: "Keep the question under 300 characters." };
  try {
    const answer = await api<StandInAnswerWire>(`/api/v1/meetings/${meetingId}/stand-ins/${userId}/ask`, {
      method: "POST",
      body: { question: q },
    });
    return { ok: true, answer };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { ok: false, message: "Their Myte is no longer standing in for them here.", status: 404 };
    }
    if (err instanceof ApiError && err.status === 403) {
      return { ok: false, message: "Only people in this meeting can ask its Mytes.", status: 403 };
    }
    return fail(err, "Myte", "ask their Myte");
  }
}
