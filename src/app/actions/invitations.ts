"use server";

import { api, ApiError } from "@/lib/api/client";
import { fetchInvitations, type InvitationsRead } from "@/lib/api/invitations";
import { INVITE_LIMITS, type InvitationSendResult } from "@/lib/api/invitations-types";

/* Meeting invitations by email (ADR-0043). core-api decides who may send (the host, the creator
   or a workspace admin), keeps recipients inside the workspace and rate-limits per meeting; these
   actions only shape the request and turn its answer into words. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SendInvitationsResult = { ok: true; result: InvitationSendResult } | { ok: false; message: string };

/**
 * Email the meeting to workspace members (`POST /api/v1/meetings/:id/invitations`). Sending to
 * someone already invited sends it again (Resend, Retry). `message` left out keeps the note sent
 * before. `api()` adds an Idempotency-Key, so a double click sends once.
 */
export async function sendInvitations(meetingId: string, userIds: string[], message?: string | null): Promise<SendInvitationsResult> {
  if (!UUID.test(meetingId)) return { ok: false, message: "That meeting no longer exists." };
  const ids = Array.from(new Set(userIds.filter((id) => UUID.test(id))));
  if (ids.length === 0) return { ok: false, message: "Pick at least one person." };
  if (ids.length > INVITE_LIMITS.maxRecipients) {
    return { ok: false, message: `Invite at most ${INVITE_LIMITS.maxRecipients} people at a time.` };
  }
  const note = typeof message === "string" ? message.trim().slice(0, INVITE_LIMITS.messageMax) : "";
  const body: Record<string, unknown> = { user_ids: ids };
  if (note) body.message = note;
  try {
    const result = await api<InvitationSendResult>(`/api/v1/meetings/${meetingId}/invitations`, { method: "POST", body });
    return { ok: true, result };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 403) return { ok: false, message: "Only the host, whoever created the meeting or a workspace admin can send invitations." };
      if (err.status === 404) return { ok: false, message: "That meeting or person is no longer in this workspace." };
      if (err.status === 409) return { ok: false, message: "This meeting is over, so it can't take invitations." };
      if (err.status === 422) return { ok: false, message: "Only people in this workspace can be invited." };
      if (err.status === 429) return { ok: false, message: "That's a lot of invitations for one meeting. Try again in an hour." };
    }
    return { ok: false, message: "Invitations couldn't be sent just now. Try again in a moment." };
  }
}

/** Re-read the card (its Retry, and after a send). */
export async function loadInvitations(meetingId: string): Promise<InvitationsRead> {
  if (!UUID.test(meetingId)) return { ok: false, status: 404 };
  return fetchInvitations(meetingId);
}

/** Whether this workspace can send email at all (the New meeting window, before a meeting
    exists). Null when it could not be asked. */
export async function invitationEmailStatus(): Promise<boolean | null> {
  try {
    const res = await api<{ email_configured: boolean | null }>("/api/v1/meetings/invitations/status");
    return res.email_configured;
  } catch {
    return null;
  }
}
