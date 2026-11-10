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
import type { components as CoreApiSchemas } from "@/lib/api/generated/core-api";

type CoreApi = CoreApiSchemas["schemas"];

/** One persisted final from `transcript_chunks`. `speaker_id` is the raw diarized label, never
 *  a resolved user: `meeting_speakers` is what maps it to a person. */
export type TranscriptChunk = CoreApi["TranscriptChunk"];

export type TranscriptPage = CoreApi["TranscriptPage"];

/** `assignment` is `manual` or `suggested`, and a database trigger makes manual authoritative,
 *  so there is no value this client could send that would downgrade a human's answer. */
export type MeetingSpeaker = CoreApi["MeetingSpeaker"];

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
 * `null` means the backend could not be reached (no `API_GATEWAY_URL`, or a network failure),
 * and the callers render an empty transcript for it, never sample lines. A configured gateway
 * that returns 404 is a real not-found and is rethrown. `client.ts` throws a plain `Error` for
 * the unset-origin case (deliberately, so a wrong default cannot send session tokens to an
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
      // caller, which the page renders as not-found.
      throw error;
    }
    return null;
  }
}
