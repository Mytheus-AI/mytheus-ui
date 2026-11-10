/**
 * The weekly "what changed for you" digest (only-Mytheus wave, contract section 5) on core-api.
 * Built Mondays for the previous ISO week, one per person, filtered by the topics your agent
 * listens for.
 *
 *   GET /api/v1/digests/latest        {digest | null, next_run_at}
 *   GET /api/v1/digests/preview       this week so far (not stored, id null)
 *   GET /api/v1/digests?limit=12      past weeks, newest first
 *   GET /api/v1/digests/{id}          one stored week
 *   GET /api/v1/digests/preferences   {weekly_enabled, email_enabled}
 *   PUT /api/v1/digests/preferences
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import type { DigestList, DigestPreferences, LatestDigest, WeeklyDigest } from "@/lib/api/only-mytheus-types";

export async function fetchLatestDigest(): Promise<LatestDigest> {
  return api<LatestDigest>("/api/v1/digests/latest");
}

export async function fetchDigestPreview(): Promise<WeeklyDigest> {
  return api<WeeklyDigest>("/api/v1/digests/preview");
}

export async function fetchDigestList(limit = 12): Promise<DigestList> {
  return api<DigestList>("/api/v1/digests", { query: { limit } });
}

export async function fetchDigest(id: string): Promise<WeeklyDigest> {
  return api<WeeklyDigest>(`/api/v1/digests/${encodeURIComponent(id)}`);
}

export async function fetchDigestPreferences(): Promise<DigestPreferences> {
  return api<DigestPreferences>("/api/v1/digests/preferences");
}

export async function putDigestPreferences(prefs: DigestPreferences): Promise<DigestPreferences> {
  return api<DigestPreferences>("/api/v1/digests/preferences", { method: "PUT", body: prefs });
}
