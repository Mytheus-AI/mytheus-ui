"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api/client";
import { fetchClips, fetchRecording } from "@/lib/api/recording";
import { EXPIRY_CHOICES } from "@/components/minutes/minutes-model";
import {
  MAX_CLIP_MS,
  clipFailure,
  type Clip,
  type ClipFailure,
  type ClipList,
  type ClipShareLink,
  type Read,
  type RecordingState,
} from "@/components/recording/recording-model";

/* Recording playback: the re-reads the Recording card makes (fresh playback URLs, polling while
   the recording is processed) and the clip writes. Every call goes through `api()`, which attaches
   the session token and an Idempotency-Key; nothing about the tenant or the person is taken from
   the input: meeting-service and core-api decide who may play, clip and share (participants only,
   a confidential meeting's clips shared only by its host). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const seg = (id: string) => encodeURIComponent(id);

export async function loadRecording(meetingId: string): Promise<Read<RecordingState>> {
  if (!UUID.test(meetingId)) return { ok: false, reason: "none" };
  return fetchRecording(meetingId);
}

export async function loadClips(meetingId: string): Promise<Read<ClipList>> {
  if (!UUID.test(meetingId)) return { ok: false, reason: "none" };
  return fetchClips(meetingId);
}

export type ClipResult = { ok: true; clip: Clip } | { ok: false; failure: ClipFailure };

function failed(error: unknown): { ok: false; failure: ClipFailure } {
  if (error instanceof ApiError) return { ok: false, failure: clipFailure(error.status, error.reason, error.code) };
  return { ok: false, failure: "error" };
}

/** `POST /api/v1/meetings/{id}/clips`: name a span of the meeting (at most 10 minutes). */
export async function createClip(
  meetingId: string,
  input: { title: string; startMs: number; endMs: number },
): Promise<ClipResult> {
  const title = input.title.replace(/\s+/g, " ").trim().slice(0, 200);
  const start = Math.max(0, Math.round(input.startMs));
  const end = Math.round(input.endMs);
  if (!UUID.test(meetingId) || !title || end <= start || end - start > MAX_CLIP_MS) return { ok: false, failure: "error" };
  try {
    const clip = await api<Clip>(`/api/v1/meetings/${seg(meetingId)}/clips`, {
      method: "POST",
      body: { title, start_ms: start, end_ms: end },
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true, clip };
  } catch (error) {
    return failed(error);
  }
}

/** `DELETE /api/v1/clips/{id}`: its share links stop working at once. */
export async function deleteClip(meetingId: string, clipId: string): Promise<{ ok: boolean }> {
  if (!UUID.test(meetingId) || !UUID.test(clipId)) return { ok: false };
  try {
    await api<void>(`/api/v1/clips/${seg(clipId)}`, { method: "DELETE" });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export type ShareClipResult = { ok: true; link: ClipShareLink } | { ok: false; failure: ClipFailure };

/** `POST /api/v1/clips/{id}/share-links`: a public page for one clip. */
export async function shareClip(
  meetingId: string,
  clipId: string,
  input: { expiresInDays: number; includeVideo: boolean; confirmConfidential: boolean },
): Promise<ShareClipResult> {
  if (!UUID.test(meetingId) || !UUID.test(clipId)) return { ok: false, failure: "error" };
  const days = EXPIRY_CHOICES.some((c) => c.days === input.expiresInDays) ? input.expiresInDays : 30;
  try {
    const link = await api<ClipShareLink>(`/api/v1/clips/${seg(clipId)}/share-links`, {
      method: "POST",
      body: {
        expires_in_days: days,
        include_video: input.includeVideo === true,
        confirm_confidential: input.confirmConfidential === true,
      },
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true, link };
  } catch (error) {
    return failed(error);
  }
}

/** `DELETE /api/v1/share-links/{id}`: turn a clip's link off (idempotent). */
export async function revokeClipLink(meetingId: string, linkId: string): Promise<{ ok: boolean }> {
  if (!UUID.test(meetingId) || !UUID.test(linkId)) return { ok: false };
  try {
    await api<void>(`/api/v1/share-links/${seg(linkId)}`, { method: "DELETE" });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
