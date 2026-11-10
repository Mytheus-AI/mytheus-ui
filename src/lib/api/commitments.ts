/**
 * Promises (ADR-0039 B6) on `core-api`:
 *
 *   GET   /api/v1/commitments?status=   the caller's own promises
 *   PATCH /api/v1/commitments/{id}      {status}; owner only (404 otherwise)
 *
 * A promise is written by the caller's own PersonalListener record and is private to them.
 * HAND-WRITTEN TYPES (`personal-types.ts`) until the client is regenerated.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";
import { listMeetings } from "@/lib/api/meetings";
import {
  itemsOf,
  type Commitment,
  type CommitmentStatus,
  type PromiseView,
} from "@/lib/api/personal-types";

/* Display joins when the rows do not carry them. Reads the caller can already make, so nothing
   is exposed that the server did not allow; a failed join degrades to neutral wording. */

export interface MeetingInfo {
  title: string | null;
  scheduledStart: string | null;
}

export async function meetingInfoById(): Promise<Map<string, MeetingInfo>> {
  const out = new Map<string, MeetingInfo>();
  try {
    const meetings = await listMeetings();
    for (const m of meetings ?? []) out.set(m.id, { title: m.title ?? null, scheduledStart: m.scheduled_start ?? null });
  } catch {
    // A join only: neutral wording instead.
  }
  return out;
}

export async function fetchCommitments(status?: CommitmentStatus): Promise<Commitment[]> {
  const body = await api<unknown>("/api/v1/commitments", { query: { status } });
  return itemsOf<Commitment>(body);
}

export async function patchCommitment(id: string, status: CommitmentStatus): Promise<Commitment> {
  return api<Commitment>(`/api/v1/commitments/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } });
}

/** Rows plus their meeting's title. Throws when the promises themselves cannot be read. */
export async function fetchMyPromises(status?: CommitmentStatus): Promise<PromiseView[]> {
  const rows = await fetchCommitments(status);
  const needJoin = rows.some((r) => !r.meeting_title);
  const meetings = needJoin ? await meetingInfoById() : new Map();
  return rows.map((r) => ({
    ...r,
    meetingTitle: r.meeting_title?.trim() || meetings.get(r.meeting_id)?.title?.trim() || "An untitled meeting",
  }));
}
