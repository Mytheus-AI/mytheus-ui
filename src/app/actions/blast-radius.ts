"use server";

import { fetchBlastRadius, fetchMeetingBlastRadius } from "@/lib/api/blast-radius";
import type { BlastRadius, Load, MeetingBlastItem } from "@/lib/api/why-blast-types";
import { isUuid } from "@/lib/decision-why";

/* Blast radius re-reads: the decision page polls one while the agent works out the ripple, and the
   room and the after page poll the meeting's one-line summaries after a decision is confirmed. */

export async function readBlastRadius(decisionId: string): Promise<Load<BlastRadius>> {
  if (!isUuid(decisionId)) return { ok: false, reason: "none" };
  return fetchBlastRadius(decisionId);
}

export async function readMeetingBlastRadius(meetingId: string): Promise<Load<MeetingBlastItem[]>> {
  if (!isUuid(meetingId)) return { ok: false, reason: "none" };
  return fetchMeetingBlastRadius(meetingId);
}
