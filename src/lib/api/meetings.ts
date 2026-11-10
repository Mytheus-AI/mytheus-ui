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
import type { AgendaItem, MeetingAgendaFields, MeetingLinkSummary } from "@/lib/api/meeting-agenda-types";
import type { ApiMeeting, MeetingPage } from "@/lib/api/types";
import type { MeetingStatus } from "@/lib/types";

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
  /** Who is in it and in what role (`host`, or null for an attendee). */
  participants: { id: string; role: string | null }[];
  /** Its time came and went with nobody ever joining: shown as ended, never as joinable. */
  missed: boolean;
  /** The one host (ADR-0038 D5): `host_user_id`, else the participant marked host, else the creator. */
  hostUserId: string | null;
  /** Who created it; with the host, the only person who may edit the agenda or the link (D6). */
  createdBy: string | null;
  /** The meeting this one follows up, when linked (D5). */
  previousMeetingId: string | null;
  /** Its title and start, on a single-meeting read only (D6). */
  previousMeeting: MeetingLinkSummary | null;
  /** The agenda in order, on a single-meeting read only; [] otherwise (D6). */
  agenda: AgendaItem[];
}

/** A scheduled meeting this long past its end with nobody having joined is over. Matches the
 *  five minutes a LiveKit room stays open after its last participant leaves. */
const GRACE_MS = 5 * 60_000;

/** A meeting without a scheduled end is shown as the default half hour. */
const DEFAULT_MINUTES = 30;

export function toCallMeeting(raw: ApiMeeting): CallMeeting {
  // ADR-0038 fields, read by hand until the generated core-api client is regenerated.
  const m = raw as ApiMeeting & Partial<MeetingAgendaFields>;
  const minutes =
    m.scheduled_start && m.scheduled_end
      ? Math.max(1, Math.round((Date.parse(m.scheduled_end) - Date.parse(m.scheduled_start)) / 60000))
      : DEFAULT_MINUTES;
  // The server keeps a meeting `scheduled` until its call starts. One whose end is well past
  // with no call is shown as over, so its Join button goes away (meeting-service also closes an
  // empty room after five minutes and marks the meeting ended).
  const startMs = Date.parse(m.scheduled_start ?? m.created_at);
  const missed =
    m.status === "scheduled" && Number.isFinite(startMs) && Date.now() > startMs + minutes * 60_000 + GRACE_MS;
  return {
    id: m.id,
    title: m.title ?? "Untitled meeting",
    startTime: m.scheduled_start ?? m.created_at,
    durationMinutes: minutes,
    status: missed ? "past" : toMockStatus(m.status),
    invited: m.participants?.length ?? 0,
    participantIds: (m.participants ?? []).map((p) => p.user_id),
    participants: (m.participants ?? []).map((p) => ({ id: p.user_id, role: p.role_in_meeting ?? null })),
    missed,
    hostUserId:
      m.host_user_id ?? (m.participants ?? []).find((p) => p.role_in_meeting === "host")?.user_id ?? m.created_by ?? null,
    createdBy: m.created_by ?? null,
    previousMeetingId: m.previous_meeting_id ?? m.previous_meeting?.id ?? null,
    previousMeeting: m.previous_meeting ?? null,
    agenda: Array.isArray(m.agenda) ? [...m.agenda].sort((a, b) => a.position - b.position) : [],
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
