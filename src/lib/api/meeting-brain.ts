/**
 * The meeting reads ADR-0039 adds, through the gateway. Server-only, like everything that
 * imports `client.ts`.
 *
 * Each returns a three-way answer the screens render differently:
 *   - `{ ok: true, data }`: the read answered;
 *   - `{ ok: false, reason: "none" }`: the server says there is nothing for you here (404, 403,
 *     or 409 for a health read before the meeting ended), shown as an empty or "not for you" state;
 *   - `{ ok: false, reason: "error" }`: it could not be read (gateway down, 5xx, a bad body),
 *     shown as "couldn't load", never as "nothing here".
 */

import { apiSafe } from "@/lib/api/client";
import {
  toActiveGoals,
  toBrief,
  toCatchUp,
  toHealth,
  toTemplates,
} from "@/lib/api/meeting-brain-normalize";
import type { MeetingBrief, MeetingCatchUp, MeetingHealth, MeetingTemplate, OrgGoal } from "@/lib/api/meeting-brain-types";

export type BrainRead<T> = { ok: true; data: T } | { ok: false; reason: "none" | "error" };

async function read<T>(path: string, shape: (raw: unknown) => T | null): Promise<BrainRead<T>> {
  const res = await apiSafe<unknown>(path);
  if (!res.ok) {
    const s = res.error.status;
    return { ok: false, reason: s === 403 || s === 404 || s === 409 ? "none" : "error" };
  }
  const data = shape(res.data);
  return data === null ? { ok: false, reason: "error" } : { ok: true, data };
}

const seg = (id: string) => encodeURIComponent(id);

/** Your brief for a meeting you are in (B8), anchored `#brief` on the meeting page. */
export function fetchMeetingBrief(meetingId: string): Promise<BrainRead<MeetingBrief>> {
  return read(`/bff/meetings/${seg(meetingId)}/brief`, toBrief);
}

/** The health card's numbers (B8), after the meeting ended. */
export function fetchMeetingHealth(meetingId: string): Promise<BrainRead<MeetingHealth>> {
  return read(`/bff/meetings/${seg(meetingId)}/health`, toHealth);
}

/** The catch-up (B8), for someone who sent their agent or missed the meeting. */
export function fetchMeetingCatchUp(meetingId: string): Promise<BrainRead<MeetingCatchUp>> {
  return read(`/bff/meetings/${seg(meetingId)}/catch-up`, toCatchUp);
}

/** The workspace's meeting types (B1), or null when they could not be read. */
export async function fetchMeetingTemplates(): Promise<MeetingTemplate[] | null> {
  const res = await apiSafe<unknown>("/api/v1/meeting-templates");
  return res.ok ? toTemplates(res.data) : null;
}

/** The workspace's active goals (A4). A failed read is no goals: the picker is optional. */
export async function fetchActiveGoals(): Promise<OrgGoal[]> {
  const res = await apiSafe<unknown>("/api/v1/org/goals");
  return res.ok ? toActiveGoals(res.data) : [];
}
