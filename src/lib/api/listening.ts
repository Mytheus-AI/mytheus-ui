/**
 * "In every meeting at once" reads on core-api (Beyond the meeting, Layer 3). Each returns a
 * result union through `apiSafe`, so a page assembled from several of them degrades one panel at
 * a time. SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { apiSafe } from "@/lib/api/client";
import type {
  EveningDigest,
  EveningDigestSummary,
  Interruption,
  ListeningPreferencesView,
  ListeningWeek,
  MeetingAttendanceChoice,
  MeetingViewList,
  StandingPosition,
} from "@/lib/api/listening-types";

export function fetchListeningWeek(start?: string | null) {
  return apiSafe<ListeningWeek>("/api/v1/listening/week", { query: start ? { start } : undefined });
}

export function fetchListeningPreferences() {
  return apiSafe<ListeningPreferencesView>("/api/v1/listening/preferences");
}

export function fetchPositions() {
  return apiSafe<{ items: StandingPosition[] }>("/api/v1/listening/positions");
}

export function fetchInterruptions(limit = 30) {
  return apiSafe<{ items: Interruption[] }>("/api/v1/listening/interruptions", { query: { limit } });
}

export function fetchLatestEveningDigest() {
  return apiSafe<EveningDigest>("/api/v1/listening/digests/latest");
}

export function fetchEveningDigest(day: string) {
  return apiSafe<EveningDigest>(`/api/v1/listening/digests/${encodeURIComponent(day)}`);
}

export function fetchEveningDigests(limit = 14) {
  return apiSafe<{ items: EveningDigestSummary[] }>("/api/v1/listening/digests", { query: { limit } });
}

export function fetchAttendanceChoice(meetingId: string) {
  return apiSafe<MeetingAttendanceChoice>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/attendance-choice`);
}

export function fetchMeetingViews(meetingId: string) {
  return apiSafe<MeetingViewList>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/views`);
}
