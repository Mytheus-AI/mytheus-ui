/**
 * A briefing from your Myte, core-api (the caller's own briefings only):
 *
 *   GET  /api/v1/briefings/latest            {briefing | null, enabled, auto_play}
 *   GET  /api/v1/briefings?limit=            {items}
 *   GET  /api/v1/briefings/{id}              one briefing (poll it while it is being written)
 *   GET  /api/v1/meetings/{id}/briefing      {briefing | null, enabled, auto_play, can_request}
 *   GET  /api/v1/briefings/preferences       the settings plus server voice state and languages
 *
 * Writes are the server actions in `app/actions/briefings.ts`. SERVER-ONLY, inherited from
 * `lib/api/client.ts`.
 */

import { apiSafe } from "@/lib/api/client";
import type { Briefing, BriefingLatest, BriefingSettings, MeetingBriefing } from "@/lib/briefing";

export type Load<T> = { kind: "live"; data: T } | { kind: "unavailable" } | { kind: "missing" };

async function load<T>(path: string, query?: Record<string, string | number>): Promise<Load<T>> {
  const res = await apiSafe<T>(path, query ? { query } : {});
  if (res.ok) return { kind: "live", data: res.data };
  if (res.error.isAuthFailure) throw res.error;
  return res.error.status === 404 ? { kind: "missing" } : { kind: "unavailable" };
}

export function fetchLatestBriefing(): Promise<Load<BriefingLatest>> {
  return load<BriefingLatest>("/api/v1/briefings/latest");
}

export function fetchBriefingList(limit = 12): Promise<Load<{ items: Briefing[] }>> {
  return load<{ items: Briefing[] }>("/api/v1/briefings", { limit });
}

export function fetchBriefing(id: string): Promise<Load<Briefing>> {
  return load<Briefing>(`/api/v1/briefings/${encodeURIComponent(id)}`);
}

export function fetchMeetingBriefing(meetingId: string): Promise<Load<MeetingBriefing>> {
  return load<MeetingBriefing>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/briefing`);
}

export function fetchBriefingSettings(): Promise<Load<BriefingSettings>> {
  return load<BriefingSettings>("/api/v1/briefings/preferences");
}

