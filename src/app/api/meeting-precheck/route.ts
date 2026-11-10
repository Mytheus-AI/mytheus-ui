/**
 * `POST /api/meeting-precheck` - "Should this be a meeting?" for the new-meeting dialog
 * (only-Mytheus wave, contract section 3), proxied to `POST /bff/meetings/precheck`.
 *
 * A route handler rather than a Server Action because the dialog asks as you type: Server Actions
 * queue one behind another and cannot be aborted, while a fetch to this handler can be dropped the
 * moment the text changes again. `lib/api/client.ts` is server-only, so the client island needs
 * this hop. The hint never blocks scheduling, so every failure answers an empty result with
 * `degraded: true` instead of an error, except a lost session, which the dialog should know about.
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { postMeetingPrecheck } from "@/lib/api/meeting-precheck";
import { buildPrecheckRequest, shouldPrecheck } from "@/lib/meeting-precheck";
import { isUuid } from "@/lib/reversals";

const EMPTY = { already_decided: [], status_updates: [], recent_meetings: [], retrieval: "keyword" as const };

export async function POST(request: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ code: "MALFORMED_BODY" }, { status: 400 });
  }
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title : "";
  const agenda = Array.isArray(o.agenda) ? o.agenda.filter((a): a is string => typeof a === "string") : [];
  const participants = Array.isArray(o.participant_ids) ? o.participant_ids.filter(isUuid) : [];
  if (!shouldPrecheck(title, agenda)) return NextResponse.json({ ...EMPTY, degraded: false });

  try {
    const body = await postMeetingPrecheck(buildPrecheckRequest(title, agenda, participants));
    return NextResponse.json({
      already_decided: Array.isArray(body?.already_decided) ? body.already_decided : [],
      status_updates: Array.isArray(body?.status_updates) ? body.status_updates : [],
      recent_meetings: Array.isArray(body?.recent_meetings) ? body.recent_meetings : [],
      retrieval: body?.retrieval === "semantic" ? "semantic" : "keyword",
      degraded: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.isAuthFailure) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    return NextResponse.json({ ...EMPTY, degraded: true });
  }
}
