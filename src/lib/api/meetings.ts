/**
 * The Meeting tab's reads from `core-api`, and the one place their wire shape becomes the shape
 * the screens render. Server-only, like everything that imports `client.ts`.
 *
 * What the server does not have yet is left out rather than filled in: participants come as user
 * ids with no display names, and there is no agenda, recap, decision or action read model yet.
 * Screens show those as empty states, never as sample content.
 */

import { ApiError, api } from "@/lib/api/client";
import { toMockStatus } from "@/lib/api/present";
import type { ApiMeeting, MeetingPage } from "@/lib/api/types";
import type { MeetingStatus } from "@/lib/mock/data";

/** A meeting as the hub, detail and call screens render it. */
export interface CallMeeting {
  id: string;
  title: string;
  /** ISO string, or "" for a meeting with no scheduled start. */
  startTime: string;
  durationMinutes: number;
  status: MeetingStatus;
  /** Everyone on the participant list, the host included. */
  invited: number;
  /** Internal user ids of those participants, for leaving them out of an invite picker. */
  participantIds: string[];
}

/** A meeting without a scheduled end is shown as the default half hour. */
const DEFAULT_MINUTES = 30;

export function toCallMeeting(m: ApiMeeting): CallMeeting {
  const minutes =
    m.scheduled_start && m.scheduled_end
      ? Math.max(1, Math.round((Date.parse(m.scheduled_end) - Date.parse(m.scheduled_start)) / 60000))
      : DEFAULT_MINUTES;
  return {
    id: m.id,
    title: m.title ?? "Untitled meeting",
    startTime: m.scheduled_start ?? m.created_at,
    durationMinutes: minutes,
    status: toMockStatus(m.status),
    invited: m.participants?.length ?? 0,
    participantIds: (m.participants ?? []).map((p) => p.user_id),
  };
}

/** Pages are capped server-side; this many pages is far past what the hub can usefully show. */
const MAX_PAGES = 5;
const PAGE_SIZE = 100;

/**
 * Every meeting the caller can see, newest first, or null when the gateway is not configured or
 * not reachable. Null is "could not load", which the hub must not show as "you have none".
 */
export async function listMeetings(): Promise<ApiMeeting[] | null> {
  const out: ApiMeeting[] = [];
  let cursor: string | null = null;
  try {
    for (let i = 0; i < MAX_PAGES; i++) {
      const qs: string = `?limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const page: MeetingPage = await api<MeetingPage>(`/api/v1/meetings${qs}`);
      out.push(...page.items);
      cursor = page.next_cursor ?? null;
      if (!cursor) break;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status !== 0 && error.code !== "DEPENDENCY_UNAVAILABLE") throw error;
    return null;
  }
  return out;
}
