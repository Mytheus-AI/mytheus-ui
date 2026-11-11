/**
 * Blast radius on core-api (a4 contract, section 3b). SERVER-ONLY, inherited from `client.ts`.
 *
 *   GET /api/v1/decisions/{id}/blast-radius     BlastRadius (always three rings)
 *   GET /api/v1/meetings/{id}/blast-radius      {items: {decision_id, content, state, summary, counts}[]}
 */

import { load } from "@/lib/api/why-blast-call";
import type { BlastRadius, Load, MeetingBlastItem } from "@/lib/api/why-blast-types";
import { blastRoutes, normalizeBlast, normalizeMeetingBlast } from "@/lib/blast-radius";

export function fetchBlastRadius(decisionId: string): Promise<Load<BlastRadius>> {
  return load({ method: "GET", path: blastRoutes.decision(decisionId) }, normalizeBlast);
}

export function fetchMeetingBlastRadius(meetingId: string): Promise<Load<MeetingBlastItem[]>> {
  return load({ method: "GET", path: blastRoutes.meeting(meetingId) }, normalizeMeetingBlast);
}
