import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { fetchMeeting } from "@/lib/api/meeting";
import { toCallMeeting, type CallMeeting } from "@/lib/api/meetings";

export type { CallMeeting };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The meeting behind a call URL, for the pre-join and the room alike, read from core-api.
 *
 * A 404 from the server is a real not-found (existence is tenant-confidential), and so is an id
 * that is not a UUID, which the server would only answer 422. An unreachable gateway says nothing
 * about the meeting, so it goes to the error boundary rather than being disguised as missing.
 */
export async function resolveCallMeeting(meetingId: string): Promise<CallMeeting> {
  if (!UUID.test(meetingId)) notFound();

  let real;
  try {
    real = await fetchMeeting(meetingId);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
    throw error;
  }
  if (!real) throw new Error("The meeting service is unreachable.");
  return toCallMeeting(real);
}
