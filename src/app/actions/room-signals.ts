"use server";

import { revalidatePath } from "next/cache";

import { ApiError, api } from "@/lib/api/client";
import { fetchRecording } from "@/lib/api/recording";
import { fetchAfterSignals, fetchResumePoint, type SignalRead } from "@/lib/api/room-signals";
import type {
  AfterSignals,
  AgreementAnswer,
  AgreementAnswerBody,
  AgreementCheck,
  LastWordNudge,
  ResumePoint,
  ResumePointRead,
} from "@/lib/api/room-signals-types";
import { locate, playableSegments } from "@/components/recording/recording-model";
import { AGREEMENT_NOTE_MAX, isId } from "@/lib/room-signals";

/* The last word, the agreement check and pick up where we stopped, against core-api (a3 room
   signals contract section 4). Every write forwards the caller's own session with an
   Idempotency-Key (`api()` adds one); core-api decides who may do what (your own nudge, your own
   check, a participant continues, the host dismisses) and answers 404 across tenants. Creating a
   late contribution is a route handler instead (`app/api/meetings/[meetingId]/late-contributions`),
   because a recording is too large for a Server Action. */

type Fail = { ok: false; message: string; gone?: boolean; status?: number };

function fail(err: unknown, what: string, verb: string): Fail {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again.", status: err.status };
    if (err.status === 403) return { ok: false, message: `You can't ${verb}.`, status: 403 };
    if (err.status === 404) return { ok: false, message: `That ${what} is no longer here.`, gone: true, status: 404 };
    if (err.status === 409) return { ok: false, message: `That ${what} has already been settled.`, status: 409 };
    if (err.status === 422) return { ok: false, message: "That wasn't accepted. Check it and try again.", status: 422 };
  }
  return { ok: false, message: `Couldn't ${verb} just now. Try again in a moment.`, status: err instanceof ApiError ? err.status : 0 };
}

const gone = (what: string): Fail => ({ ok: false, message: `That ${what} is no longer here.`, gone: true, status: 404 });

/* ------------------------------------------------------------------ the last word */

export type NudgeResult = { ok: true; nudge: LastWordNudge } | Fail;

/** "Nothing to add": the nudge closes for you (Undo never sends it; see `graceful`). */
export async function dismissLastWord(id: string): Promise<NudgeResult> {
  if (!isId(id)) return gone("nudge");
  try {
    const nudge = await api<LastWordNudge>(`/api/v1/last-word/${id}/dismiss`, { method: "POST" });
    revalidatePath("/inbox");
    revalidatePath(`/meetings/${nudge.meeting_id}`);
    return { ok: true, nudge };
  } catch (err) {
    return fail(err, "nudge", "close this nudge");
  }
}

export type DeleteResult = { ok: true } | Fail;

/** Remove your own late contribution; the nudge it answered opens again. */
export async function deleteLateContribution(id: string, meetingId: string): Promise<DeleteResult> {
  if (!isId(id)) return gone("contribution");
  try {
    await api<void>(`/api/v1/late-contributions/${id}`, { method: "DELETE" });
    if (isId(meetingId)) revalidatePath(`/meetings/${meetingId}`);
    revalidatePath("/inbox");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { ok: true }; // already gone: what was asked
    return fail(err, "contribution", "remove this contribution");
  }
}

/** The after page re-reads its private and shared parts (polling until the analysis arrives). */
export async function loadAfterSignals(meetingId: string): Promise<SignalRead<AfterSignals>> {
  if (!isId(meetingId)) return { ok: false, reason: "none" };
  return fetchAfterSignals(meetingId);
}

/* ------------------------------------------------------------------ the agreement check */

export type AnswerResult = { ok: true; check: AgreementCheck } | (Fail & { field?: "note" });

export async function answerAgreementCheck(
  id: string,
  answer: AgreementAnswer,
  fields: { note?: string; shareName?: boolean } = {},
): Promise<AnswerResult> {
  if (!isId(id)) return gone("question");
  if (answer !== "support" && answer !== "concerns" && answer !== "object") {
    return { ok: false, message: "Choose Support, Have concerns or Object." };
  }
  const note = (fields.note ?? "").replace(/\s+/g, " ").trim();
  if (note.length > AGREEMENT_NOTE_MAX) {
    return { ok: false, message: `Keep the note to ${AGREEMENT_NOTE_MAX} characters.`, field: "note" };
  }
  const body: AgreementAnswerBody = { answer, share_name: Boolean(fields.shareName) };
  if (note) body.note = note;
  try {
    const check = await api<AgreementCheck>(`/api/v1/agreement-checks/${id}/answer`, { method: "POST", body });
    revalidatePath("/inbox");
    revalidatePath(`/meetings/${check.meeting_id}/decisions/${check.decision_id}`);
    return { ok: true, check };
  } catch (err) {
    return fail(err, "question", "send your answer");
  }
}

/* ------------------------------------------------------------------ pick up where we stopped */

export async function loadResumePoint(meetingId: string): Promise<SignalRead<ResumePointRead>> {
  if (!isId(meetingId)) return { ok: false, reason: "none" };
  return fetchResumePoint(meetingId);
}

export type ResumeResult = { ok: true; point: ResumePoint } | Fail;

/** "Continue from here": any participant of `meetingId`. */
export async function continueResumePoint(id: string, meetingId: string): Promise<ResumeResult> {
  if (!isId(id) || !isId(meetingId)) return gone("open thread");
  try {
    const point = await api<ResumePoint>(`/api/v1/resume-points/${id}/continue`, { method: "POST", body: { meeting_id: meetingId } });
    return { ok: true, point };
  } catch (err) {
    return fail(err, "open thread", "pick this up");
  }
}

/** The host sets the open thread aside for everyone. */
export async function dismissResumePoint(id: string, meetingId: string): Promise<ResumeResult> {
  if (!isId(id) || !isId(meetingId)) return gone("open thread");
  try {
    const point = await api<ResumePoint>(`/api/v1/resume-points/${id}/dismiss`, { method: "POST", body: { meeting_id: meetingId } });
    return { ok: true, point };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { ok: false, message: "Only the host can set this aside for everyone.", status: 403 };
    return fail(err, "open thread", "set this aside");
  }
}

export type ReplayResult =
  | { ok: true; url: string; mediaType: string; fromSec: number; toSec: number }
  | { ok: false; reason: "none" | "error" };

/**
 * Where the source meeting's recording plays a span: the ready segment holding its start, with
 * short-lived presigned URLs from meeting-service (participants only). `none` when there is no
 * playable recording (not recorded, still processing, or off the record then): the pin shows the
 * quote instead.
 */
export async function loadReplay(sourceMeetingId: string, startMs: number, endMs: number): Promise<ReplayResult> {
  if (!isId(sourceMeetingId) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) return { ok: false, reason: "none" };
  const rec = await fetchRecording(sourceMeetingId);
  if (!rec.ok) return { ok: false, reason: rec.reason };
  if (rec.data.status !== "ready") return { ok: false, reason: "none" };
  const segments = playableSegments(rec.data);
  const at = locate(segments, Math.max(0, startMs - 1500));
  if (!at || at.skipped) return { ok: false, reason: "none" };
  const seg = segments[at.index];
  const fromSec = at.localMs / 1000;
  const toSec = Math.min(seg.endMs - seg.startMs, Math.max(endMs + 1000, startMs + 1000) - seg.startMs) / 1000;
  return { ok: true, url: seg.url, mediaType: seg.mediaType, fromSec, toSec: Math.max(fromSec + 1, toSec) };
}
