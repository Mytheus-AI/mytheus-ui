/**
 * Server-side reads for the transcript surface. Plan 3-4 §3.8 steps 2 and 3.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`: it imports `auth()` from
 * `@clerk/nextjs/server`, so importing this from a client component fails the build rather than
 * shipping a token-fetching path into the browser bundle. The transcript page is an RSC that
 * calls these and passes plain data down to its client island.
 *
 * Both endpoints landed in `mytheus-backend` `f6c9466`; neither existed before, which is why
 * this screen has been on mock data. Field names are `snake_case` on the wire, mirroring the
 * backend columns, per this repo's naming rule.
 */

import { ApiError, api } from "@/lib/api/client";

export interface TranscriptChunk {
  id: string;
  meeting_id: string;
  speaker_id: string;
  start_ms: number;
  end_ms: number;
  text: string;
  is_final: boolean;
  confidence?: number | null;
  redacted: boolean;
}

export interface TranscriptPage {
  items: TranscriptChunk[];
  next_cursor: string | null;
}

export interface MeetingSpeaker {
  id: string;
  meeting_id: string;
  speaker_id: string;
  user_id: string | null;
  confidence: number | null;
  assignment: "manual" | "suggested";
  created_at: string;
  updated_at: string;
}

/** The transcript is bounded at roughly 360 finals per meeting by the capacity model, and the
 *  endpoint caps a page at 500, so a whole meeting normally arrives in one or two pages. This
 *  walks the cursor to completion rather than showing a partial record: a transcript that
 *  silently stops mid-meeting is worse than one that takes an extra round trip. The bound stops
 *  a pathological meeting from looping forever. */
const MAX_PAGES = 20;

export async function fetchTranscript(meetingId: string): Promise<TranscriptChunk[]> {
  const chunks: TranscriptChunk[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query: Record<string, string | number> = { limit: 500 };
    if (cursor) query.cursor = cursor;
    const result: TranscriptPage = await api<TranscriptPage>(
      `/api/v1/meetings/${encodeURIComponent(meetingId)}/transcript`,
      { query },
    );
    chunks.push(...result.items);
    if (!result.next_cursor) break;
    cursor = result.next_cursor;
  }
  return chunks;
}

export async function fetchSpeakers(meetingId: string): Promise<MeetingSpeaker[]> {
  const result = await api<{ items: MeetingSpeaker[] }>(
    `/api/v1/meetings/${encodeURIComponent(meetingId)}/speakers`,
  );
  return result.items;
}

/**
 * Both reads, or `null` when the backend is not reachable or has nothing to say.
 *
 * `null` means "fall back to the mock transcript", and the distinction it draws matters: a
 * configured gateway that returns 404 is a real not-found and must not be papered over with
 * fabricated content, whereas an unset `API_GATEWAY_URL` is simply this environment having no
 * backend yet, which is every environment today. `client.ts` throws a plain `Error` for the
 * unset-origin case (deliberately, so a wrong default cannot send session tokens to an
 * unintended host) and an `ApiError` for anything the server actually answered.
 */
export async function fetchTranscriptSurface(
  meetingId: string,
): Promise<{ chunks: TranscriptChunk[]; speakers: MeetingSpeaker[] } | null> {
  try {
    const [chunks, speakers] = await Promise.all([
      fetchTranscript(meetingId),
      fetchSpeakers(meetingId),
    ]);
    return { chunks, speakers };
  } catch (error) {
    if (error instanceof ApiError) {
      // A real answer from a real server. 404 here means this meeting is not visible to the
      // caller, which the page renders as not-found rather than as mock data.
      throw error;
    }
    return null;
  }
}
