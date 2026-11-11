/**
 * Recording playback, the reads, through the gateway. Server-only, like everything that imports
 * `client.ts`.
 *
 * - `GET /api/meetings/{id}/recording` (meeting-service): the recording's status and, when it is
 *   ready, short-lived presigned URLs for each segment (participants only);
 * - `GET /api/v1/meetings/{id}/clips` (core-api): the meeting's clips with their share links.
 *
 * Each answers `{ ok: true, data }` or `{ ok: false, reason }`: `none` when the server says there
 * is nothing for you (403, 404), `error` when it could not be read.
 */

import { apiSafe } from "@/lib/api/client";
import type { ClipList, Read, RecordingState } from "@/components/recording/recording-model";

const seg = (id: string) => encodeURIComponent(id);

async function read<T>(path: string, valid: (raw: unknown) => boolean): Promise<Read<T>> {
  const res = await apiSafe<unknown>(path);
  if (!res.ok) {
    const s = res.error.status;
    return { ok: false, reason: s === 403 || s === 404 ? "none" : "error" };
  }
  return valid(res.data) ? { ok: true, data: res.data as T } : { ok: false, reason: "error" };
}

const isObj = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === "object";

export function fetchRecording(meetingId: string): Promise<Read<RecordingState>> {
  return read(`/api/meetings/${seg(meetingId)}/recording`, (raw) => isObj(raw) && typeof raw.status === "string");
}

export function fetchClips(meetingId: string): Promise<Read<ClipList>> {
  return read(`/api/v1/meetings/${seg(meetingId)}/clips`, (raw) => isObj(raw) && Array.isArray(raw.items));
}
