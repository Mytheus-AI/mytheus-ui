/**
 * Minutes for everyone, the reads, through the gateway. Server-only, like everything that imports
 * `client.ts`.
 *
 * - `GET /api/v1/meetings/{id}/minutes`: your minutes and the shared minutes;
 * - `GET /api/v1/meetings/{id}/follow-up`: the follow-up, with the composer's draft for the host
 *   and whether this server can email guests at all (`email_configured`);
 * - `GET /api/v1/meetings/{id}/share-links`: the meeting's public recap links.
 *
 * Each answers `{ ok: true, data }` or `{ ok: false, reason }`: `none` when the server says there
 * is nothing for you (403, 404), `error` when it could not be read. The meeting page renders the
 * two differently and never shows a failed read as "nothing here".
 */

import { apiSafe } from "@/lib/api/client";
import {
  toMinutesView,
  type FollowUp,
  type MinutesView,
  type ShareLink,
} from "@/components/minutes/minutes-model";

export type Read<T> = { ok: true; data: T } | { ok: false; reason: "none" | "error" };

const seg = (id: string) => encodeURIComponent(id);

async function read<T>(path: string, shape: (raw: unknown) => T | null): Promise<Read<T>> {
  const res = await apiSafe<unknown>(path);
  if (!res.ok) {
    const s = res.error.status;
    return { ok: false, reason: s === 403 || s === 404 ? "none" : "error" };
  }
  const data = shape(res.data);
  return data === null ? { ok: false, reason: "error" } : { ok: true, data };
}

export function fetchMinutes(meetingId: string): Promise<Read<MinutesView>> {
  return read(`/api/v1/meetings/${seg(meetingId)}/minutes`, toMinutesView);
}

function toFollowUp(raw: unknown): FollowUp | null {
  const o = raw && typeof raw === "object" ? (raw as FollowUp) : null;
  if (!o || typeof o.meeting_id !== "string" || typeof o.is_host !== "boolean") return null;
  return {
    ...o,
    guest_emails: Array.isArray(o.guest_emails) ? o.guest_emails.filter((g) => typeof g === "string") : [],
    awaiting_minutes: o.awaiting_minutes === true,
    minutes_ready: o.minutes_ready === true,
    confidential: o.confidential === true,
    can_send: o.can_send === true,
  };
}

export function fetchFollowUp(meetingId: string): Promise<Read<FollowUp>> {
  return read(`/api/v1/meetings/${seg(meetingId)}/follow-up`, toFollowUp);
}

function toLinks(raw: unknown): ShareLink[] | null {
  const items = raw && typeof raw === "object" ? (raw as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return null;
  return items.filter(
    (l): l is ShareLink =>
      !!l && typeof l === "object" && typeof (l as ShareLink).id === "string" && typeof (l as ShareLink).url === "string",
  );
}

export function fetchShareLinks(meetingId: string): Promise<Read<ShareLink[]>> {
  return read(`/api/v1/meetings/${seg(meetingId)}/share-links`, toLinks);
}
