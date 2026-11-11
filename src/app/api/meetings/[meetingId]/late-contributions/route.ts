/**
 * `POST /api/meetings/{meetingId}/late-contributions` - add a late contribution (the last word,
 * a3 room signals), written or recorded.
 *
 * A route handler rather than a Server Action because a recorded point travels as audio: the
 * browser sends `multipart/form-data` (`body`, `nudge_id`, `decision_id`, `at_ms`, `audio`,
 * `duration_ms`), well past a Server Action's 1 MB body limit. This handler checks the draft with
 * the same rules the composer uses, turns the recording into the base64 JSON core-api takes, and
 * forwards it with the caller's own session and an `Idempotency-Key` (the client's, so a retried
 * send never posts twice). It holds no credential and decides nothing about who may write: core-api
 * answers 403/404 for anyone not in the meeting and 409 once the late window closed.
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ApiError, api } from "@/lib/api/client";
import type { LateContribution, LateContributionCreate } from "@/lib/api/room-signals-types";
import { LATE_LIMITS, checkLateDraft, isId, sendableMime } from "@/lib/room-signals";

export const dynamic = "force-dynamic";

function fail(status: number, message: string, field?: "body" | "audio") {
  return NextResponse.json({ ok: false, message, field }, { status });
}

export async function POST(request: Request, { params }: { params: { meetingId: string } }): Promise<Response> {
  if (!isId(params.meetingId)) return fail(404, "That meeting is no longer here.");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "That couldn't be read. Try again.");
  }
  const text = typeof form.get("body") === "string" ? (form.get("body") as string) : "";
  const audioPart = form.get("audio");
  const audio = audioPart instanceof Blob && audioPart.size > 0 ? audioPart : null;
  const durationMs = Number(form.get("duration_ms") ?? 0);
  const checked = checkLateDraft({
    body: text,
    audio: audio ? { bytes: audio.size, durationMs: Number.isFinite(durationMs) ? durationMs : 0, mime: audio.type } : null,
  });
  if (!checked.ok) return fail(422, checked.message, checked.field);

  const payload: LateContributionCreate = {};
  if (checked.body) payload.body = checked.body;
  const nudge = form.get("nudge_id");
  const decision = form.get("decision_id");
  const at = Number(form.get("at_ms"));
  if (isId(nudge)) payload.nudge_id = nudge;
  if (isId(decision)) payload.decision_id = decision;
  if (form.get("at_ms") !== null && Number.isInteger(at) && at >= 0) payload.at_ms = at;
  if (audio) {
    const mime = sendableMime(audio.type);
    if (!mime) return fail(422, "This recording format can't be sent. Write your point instead.", "audio");
    const bytes = Buffer.from(await audio.arrayBuffer());
    if (bytes.length > LATE_LIMITS.audioMaxBytes) return fail(422, "The recording is too large. Record a shorter one.", "audio");
    payload.audio = {
      data_base64: bytes.toString("base64"),
      mime,
      duration_ms: Math.min(LATE_LIMITS.audioMaxMs, Math.max(0, Math.round(durationMs))),
    };
  }
  const key = request.headers.get("idempotency-key") ?? undefined;

  try {
    const created = await api<LateContribution>(`/api/v1/meetings/${params.meetingId}/late-contributions`, {
      method: "POST",
      body: payload,
      idempotencyKey: key && /^[A-Za-z0-9_-]{8,80}$/.test(key) ? key : undefined,
    });
    revalidatePath(`/meetings/${params.meetingId}`);
    revalidatePath("/inbox");
    return NextResponse.json({ ok: true, contribution: created }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return fail(401, "Your session expired. Sign in again.");
      if (err.status === 403) return fail(403, "Only people who were in this meeting can add to it.");
      if (err.status === 404) return fail(404, "That meeting is no longer here.");
      if (err.status === 409) return fail(409, "This meeting no longer takes late contributions. They close a week after it ends.");
      if (err.status === 413) return fail(413, "The recording is too large. Record a shorter one.", "audio");
      if (err.status === 422) return fail(422, "That wasn't accepted. Check your point and try again.");
    }
    return fail(502, "That couldn't be sent just now. Your point is still here; try again in a moment.");
  }
}
