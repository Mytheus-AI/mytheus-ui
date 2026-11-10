import { apiSafe } from "@/lib/api/client";
import type { RoomSessionInfo } from "@/components/meeting/MeetingRoom";

/** meeting-service's `RoomSession` (`GET /api/meetings/{id}/session`). */
interface RoomSessionWire {
  consent_required: boolean;
  consented_at: string | null;
  consent_version: string | null;
  recording: boolean;
  started_at: string | null;
  ended: boolean;
}

/**
 * Your standing in this meeting's call, read server-side for the pre-join and the room: whether
 * you already agreed to the notice for this meeting (so it is asked once), whether calls are
 * recorded (so the notice says exactly what is kept), and when the call started (the meeting
 * clock). A failed read is not fatal: the pre-join then asks for consent, and the clock counts
 * from your join until the call's own start arrives with the token.
 */
export async function readRoomSession(meetingId: string): Promise<RoomSessionInfo | null> {
  const res = await apiSafe<RoomSessionWire>(`/api/meetings/${encodeURIComponent(meetingId)}/session`);
  if (!res.ok) return null;
  return {
    consentRequired: res.data.consent_required === true,
    consentedAt: res.data.consented_at ?? null,
    recording: res.data.recording === true,
    startedAt: res.data.started_at ?? null,
  };
}
