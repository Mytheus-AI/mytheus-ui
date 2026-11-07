import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { fetchMeeting } from "@/lib/api/meeting";
import { toMockStatus } from "@/lib/api/present";
import { mockMeetings, type Meeting } from "@/lib/mock/data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The meeting behind a call URL, for the pre-join and the room alike.
 *
 * Fixture ids ("mtg_1") resolve from the mock data as before. A real meeting id is read from
 * core-api, so a meeting created through the API can be joined. Before this the call pages knew
 * only the fixtures and answered every real meeting with 404. A 404 from the server is a real
 * not-found (existence is tenant-confidential); any other server error is thrown to the error
 * boundary rather than disguised as a missing meeting.
 */
/** A call's meeting plus how many people are invited, which a real meeting knows even though
 *  the API does not give their names. */
export type CallMeeting = Meeting & { invited?: number };

export async function resolveCallMeeting(meetingId: string): Promise<CallMeeting> {
  const mock = mockMeetings.find((m) => m.id === meetingId);
  if (mock) return mock;
  if (!UUID.test(meetingId)) notFound();

  let real;
  try {
    real = await fetchMeeting(meetingId);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
    throw error;
  }
  if (!real) notFound();

  const start = real.scheduled_start ?? "";
  const minutes =
    real.scheduled_start && real.scheduled_end
      ? Math.max(1, Math.round((Date.parse(real.scheduled_end) - Date.parse(real.scheduled_start)) / 60000))
      : 30;

  return {
    id: real.id,
    title: real.title ?? "Untitled meeting",
    startTime: start,
    durationMinutes: minutes,
    status: toMockStatus(real.status),
    // The API carries user ids, not display names; in a live call the tiles and roster come
    // from LiveKit, which knows everyone's name, so nothing is invented here.
    participants: [],
    invited: real.participants?.length ?? 0,
    decisionCount: 0,
    actionCount: 0,
  };
}
