"use server";

import { api, ApiError } from "@/lib/api/client";
import type { AttendancePut } from "@/lib/api/meeting-brain-types";
import { validateAttendance, type AttendanceDraft } from "@/components/meetings/attendance-model";

/* "Send my agent instead" (mytheus-docs ADR-0039 B5): `PUT /api/v1/meetings/{id}/attendance`.
   Self only: the server takes the person from the session, never from this input. It refuses a
   non-participant (403/404) and a meeting that has ended (409). The same validation as the form
   runs here, so a hand-made call cannot send past the limits. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AttendanceSaved = {
  attendance: "live" | "agent";
  proxyUpdate: string | null;
  proxyQuestions: string[];
};

export type AttendanceResult = { ok: true; saved: AttendanceSaved } | { ok: false; message: string; ended?: boolean };

export async function setAttendance(meetingId: string, draft: AttendanceDraft): Promise<AttendanceResult> {
  if (!UUID.test(meetingId)) return { ok: false, message: "That meeting no longer exists." };
  const checked = validateAttendance(draft);
  if (!checked.ok) {
    return { ok: false, message: checked.errors.form ?? "Check your update and questions, then try again." };
  }
  const body: AttendancePut = checked.body;
  try {
    const res = await api<{ attendance?: string; proxy_update?: string | null; proxy_questions?: string[] } | undefined>(
      `/api/v1/meetings/${meetingId}/attendance`,
      { method: "PUT", body },
    );
    // The server's answer is the truth when it sends one; otherwise what was sent was accepted.
    const attendance = res?.attendance === "agent" || res?.attendance === "live" ? res.attendance : body.attendance;
    return {
      ok: true,
      saved: {
        attendance,
        proxyUpdate: attendance === "agent" ? (res?.proxy_update ?? body.proxy_update ?? null) : null,
        proxyQuestions:
          attendance === "agent" ? (Array.isArray(res?.proxy_questions) ? res.proxy_questions : body.proxy_questions ?? []) : [],
      },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      if (err.status === 403 || err.status === 404) {
        return { ok: false, message: "Only people invited to this meeting can send their agent." };
      }
      if (err.status === 409) return { ok: false, message: "This meeting has ended, so who attends can't change.", ended: true };
      if (err.status === 422) return { ok: false, message: "Some details weren't accepted. Check the update and questions." };
    }
    return { ok: false, message: "Couldn't save that just now. Try again in a moment." };
  }
}
