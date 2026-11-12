/* SERVER-ONLY: reads through the session-bound gateway client. */
import { apiSafe } from "@/lib/api/client";
import type { InvitationList } from "./invitations-types";

export type InvitationsRead = { ok: true; data: InvitationList } | { ok: false; status: number };

/** The meeting's join and calendar links and (for a host) who was invited. Never throws: a
    failed read becomes the card's error state with Retry. */
export async function fetchInvitations(meetingId: string): Promise<InvitationsRead> {
  const res = await apiSafe<InvitationList>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/invitations`);
  return res.ok ? { ok: true, data: res.data } : { ok: false, status: res.error.status };
}
