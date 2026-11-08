"use server";

import { api, ApiError } from "@/lib/api/client";

export type CreateMeetingInput = {
  title: string;
  /** ISO 8601 with offset, computed in the browser so it is the visitor's own local time. */
  scheduledStart: string;
  durationMinutes: number;
  /** Internal user ids of workspace members to invite. The creator is added as host anyway. */
  participantIds?: string[];
};

export type CreateMeetingResult = { ok: true; id: string } | { ok: false; message: string };

const DURATIONS = new Set([15, 30, 45, 60, 90]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanIds(ids: string[] | undefined): string[] {
  return Array.from(new Set((ids ?? []).filter((id) => UUID.test(id)))).slice(0, 50);
}

/**
 * Create a meeting through core-api (`POST /api/v1/meetings`). The caller becomes its host
 * server-side; nothing about the tenant or the user is taken from the input. `api()` attaches
 * the session token and an Idempotency-Key, so a double submit cannot make two meetings.
 */
export async function createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, message: "Give the meeting a title." };
  if (title.length > 500) return { ok: false, message: "That title is too long." };
  const start = new Date(input.scheduledStart);
  if (Number.isNaN(start.getTime())) return { ok: false, message: "Pick a valid start time." };
  const minutes = DURATIONS.has(input.durationMinutes) ? input.durationMinutes : 30;
  const end = new Date(start.getTime() + minutes * 60_000);

  try {
    const meeting = await api<{ id: string }>("/api/v1/meetings", {
      method: "POST",
      body: {
        title,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        participant_ids: cleanIds(input.participantIds),
      },
    });
    return { ok: true, id: meeting.id };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 403) return { ok: false, message: "You don't have permission to create meetings here." };
      if (err.status === 422) return { ok: false, message: "Some details weren't accepted. Check the title and time." };
    }
    return { ok: false, message: "The meeting couldn't be created just now. Try again in a moment." };
  }
}

export type InviteResult = { ok: true; added: number } | { ok: false; message: string };

/**
 * Invite workspace members into an existing meeting (`POST /api/v1/meetings/:id/participants`).
 * Only someone already in the meeting may; the backend enforces it and keeps invitees inside
 * the tenant. Already-invited people are a no-op.
 */
export async function inviteToMeeting(meetingId: string, userIds: string[]): Promise<InviteResult> {
  const ids = cleanIds(userIds);
  if (!UUID.test(meetingId)) return { ok: false, message: "That meeting no longer exists." };
  if (ids.length === 0) return { ok: false, message: "Pick at least one person." };
  try {
    const before = await api<{ participants: unknown[] }>(`/api/v1/meetings/${meetingId}`);
    const after = await api<{ participants: unknown[] }>(`/api/v1/meetings/${meetingId}/participants`, {
      method: "POST",
      body: { user_ids: ids },
    });
    return { ok: true, added: Math.max(0, after.participants.length - before.participants.length) };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 403) return { ok: false, message: "Only people in this meeting can invite others." };
      if (err.status === 404) return { ok: false, message: "That meeting or person is no longer in this workspace." };
    }
    return { ok: false, message: "Invites couldn't be sent just now. Try again in a moment." };
  }
}
