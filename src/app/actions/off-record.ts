"use server";

import { api, ApiError } from "@/lib/api/client";
import type { OffRecordWire } from "@/lib/realtime/privacy";

/* Off the record and the consent receipt (polish program wave 3). Server actions, because
   `lib/api/client.ts` reads the Clerk session server-side and the room is a client island. Nothing
   about the tenant or the person is taken from the input: core-api and meeting-service decide who
   may do what (the host or the creator starts and ends a segment, 403 for anyone else; another
   tenant's meeting is 404; a receipt is only ever the caller's own).

   - `startOffRecord`      POST /api/v1/meetings/{id}/off-record  {requested_by?}
   - `endOffRecord`        POST /api/v1/meetings/{id}/off-record/end
   - `loadOffRecord`       GET  /api/v1/meetings/{id}/off-record
   - `loadConsentReceipt`  GET  /api/meetings/{id}/consent-receipt */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fail = { ok: false; message: string; status: number };

export interface OffRecordSegmentRow {
  id: string;
  started_at: string;
  started_by: string | null;
  requested_by: string | null;
  ended_at: string | null;
  ended_by: string | null;
  start_ms: number | null;
  end_ms: number | null;
  duration_ms: number | null;
}

export interface OffRecordStateRow {
  meeting_id: string;
  active: boolean;
  current: OffRecordSegmentRow | null;
  segments: OffRecordSegmentRow[];
  total_ms: number;
  can_toggle: boolean;
}

export type OffRecordResult = { ok: true; state: OffRecordStateRow; wire: OffRecordWire } | Fail;

function fail(err: unknown, verb: string): Fail {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again.", status: err.status };
    if (err.status === 403)
      return { ok: false, message: "Only the host can take the meeting off the record. Ask them from the room.", status: 403 };
    if (err.status === 404) return { ok: false, message: "This meeting is no longer here.", status: 404 };
    if (err.status === 409) return { ok: false, message: "This meeting has already ended.", status: 409 };
    if (err.status === 503)
      return { ok: false, message: "Recording could not be paused right now. Nothing changed; try again.", status: 503 };
  }
  return { ok: false, message: `Couldn't ${verb} just now. Try again in a moment.`, status: err instanceof ApiError ? err.status : 0 };
}

/** The room's live shape of core-api's answer, so this screen updates before the room echo. */
function toWire(state: OffRecordStateRow): OffRecordWire {
  const seg = state.current ?? state.segments[state.segments.length - 1] ?? null;
  return {
    active: state.active,
    segmentId: seg?.id ?? null,
    startedAt: seg?.started_at ?? null,
    startedBy: seg?.started_by ?? null,
    requestedBy: seg?.requested_by ?? null,
    endedAt: seg?.ended_at ?? null,
    endedBy: seg?.ended_by ?? null,
    totalMs: state.total_ms,
    at: new Date().toISOString(),
  };
}

const badId: Fail = { ok: false, message: "That meeting link is not valid.", status: 400 };

export async function startOffRecord(meetingId: string, requestedBy: string | null = null): Promise<OffRecordResult> {
  if (!UUID.test(meetingId) || (requestedBy !== null && !UUID.test(requestedBy))) return badId;
  try {
    const state = await api<OffRecordStateRow>(`/api/v1/meetings/${meetingId}/off-record`, {
      method: "POST",
      body: requestedBy ? { requested_by: requestedBy } : {},
    });
    return { ok: true, state, wire: toWire(state) };
  } catch (err) {
    return fail(err, "go off the record");
  }
}

export async function endOffRecord(meetingId: string): Promise<OffRecordResult> {
  if (!UUID.test(meetingId)) return badId;
  try {
    const state = await api<OffRecordStateRow>(`/api/v1/meetings/${meetingId}/off-record/end`, { method: "POST" });
    return { ok: true, state, wire: toWire(state) };
  } catch (err) {
    return fail(err, "go back on the record");
  }
}

export async function loadOffRecord(meetingId: string): Promise<OffRecordResult> {
  if (!UUID.test(meetingId)) return badId;
  try {
    const state = await api<OffRecordStateRow>(`/api/v1/meetings/${meetingId}/off-record`);
    return { ok: true, state, wire: toWire(state) };
  } catch (err) {
    return fail(err, "read the off-the-record history");
  }
}

export interface ConsentReceiptRow {
  meeting_id: string;
  meeting_title: string;
  consent_required: boolean;
  consented: boolean;
  consented_at: string | null;
  consent_version: string | null;
  current_version: string;
  recording: boolean;
  clauses: Array<{ key: string; title: string; body: string }> | null;
}

export type ConsentReceiptResult = { ok: true; receipt: ConsentReceiptRow } | Fail;

export async function loadConsentReceipt(meetingId: string): Promise<ConsentReceiptResult> {
  if (!UUID.test(meetingId)) return badId;
  try {
    const receipt = await api<ConsentReceiptRow>(`/api/meetings/${meetingId}/consent-receipt`);
    return { ok: true, receipt };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403)
      return { ok: false, message: "You are not on this meeting's participant list, so there is no receipt for you.", status: 403 };
    return fail(err, "load your receipt");
  }
}
