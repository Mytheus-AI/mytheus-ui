"use server";

import { api, ApiError } from "@/lib/api/client";
import type { CandidateRow } from "@/lib/realtime/candidates";
import type { ChatRow } from "@/lib/realtime/chat";

/* The room's own reads and writes against core-api (polish program, Phase 0). Server actions,
   because `lib/api/client.ts` is server-only (it reads the Clerk session) and the room is a client
   island. Nothing about the tenant or the user is taken from the input: `api()` forwards the
   caller's own session, and core-api decides what they may see and do.

   - `loadCandidateLedger`: the meeting's still-proposed candidates AND its confirmed ones
     (`include_resolved=true`), re-read on every (re)connect.
   - `loadChatHistory`: the meeting's stored chat, re-read on every (re)connect.
   - `endMeetingForEveryone`: the host marks the meeting ended (`PATCH status=ended`); the room
     then asks the gateway to tell everyone, which it does only once core-api shows it ended. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LedgerResult =
  | { ok: true; decisions: CandidateRow[]; actions: CandidateRow[] }
  | { ok: false; status: number };

export async function loadCandidateLedger(meetingId: string): Promise<LedgerResult> {
  if (!UUID.test(meetingId)) return { ok: false, status: 400 };
  try {
    const body = await api<{ decisions?: CandidateRow[]; actions?: CandidateRow[] }>(
      `/api/v1/meetings/${meetingId}/candidates`,
      { query: { include_resolved: true } },
    );
    return { ok: true, decisions: body.decisions ?? [], actions: body.actions ?? [] };
  } catch (err) {
    return { ok: false, status: err instanceof ApiError ? err.status : 0 };
  }
}

export type ChatHistoryResult = { ok: true; items: ChatRow[] } | { ok: false; status: number };

export async function loadChatHistory(meetingId: string): Promise<ChatHistoryResult> {
  if (!UUID.test(meetingId)) return { ok: false, status: 400 };
  try {
    const body = await api<{ items?: ChatRow[] }>(`/api/v1/meetings/${meetingId}/chat`);
    return { ok: true, items: Array.isArray(body.items) ? body.items : [] };
  } catch (err) {
    return { ok: false, status: err instanceof ApiError ? err.status : 0 };
  }
}

export type EndResult = { ok: true } | { ok: false; message: string };

export async function endMeetingForEveryone(meetingId: string): Promise<EndResult> {
  if (!UUID.test(meetingId)) return { ok: false, message: "That meeting link is not valid." };
  try {
    await api(`/api/v1/meetings/${meetingId}`, { method: "PATCH", body: { status: "ended" } });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 403) return { ok: false, message: "Only the host can end the meeting for everyone." };
      if (err.status === 404) return { ok: false, message: "This meeting is no longer here." };
    }
    return { ok: false, message: "Couldn't end the meeting just now. Try again in a moment." };
  }
}
