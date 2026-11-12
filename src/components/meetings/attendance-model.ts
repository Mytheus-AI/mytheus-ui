/**
 * "Send my agent instead" (mytheus-docs ADR-0039 B5): the form's state and its validation, shared
 * by the meeting page card and the server action. Pure, so the rules are unit tested and the
 * messages match the server's limits.
 *
 * Limits: an update of up to 2000 characters; up to 5 questions, each up to 300. Sending your
 * agent needs something for it to carry: an update or at least one question. Going back to
 * attending yourself needs nothing.
 */

import { ATTENDANCE_LIMITS, type Attendance, type AttendancePut } from "../../lib/api/meeting-brain-types.ts";

export interface AttendanceDraft {
  attendance: Attendance;
  update: string;
  /** As typed, one entry per question box; blank boxes are ignored. */
  questions: string[];
}

export type AttendanceErrors = {
  update?: string;
  questions?: Record<number, string>;
  form?: string;
};

export const ATTENDANCE_MESSAGES = {
  updateTooLong: `Keep your update to ${ATTENDANCE_LIMITS.updateMax} characters.`,
  questionTooLong: `Keep each question to ${ATTENDANCE_LIMITS.questionMax} characters.`,
  tooManyQuestions: `Your Myte can carry at most ${ATTENDANCE_LIMITS.questionsMax} questions.`,
  nothingToCarry: "Add an update or a question for your Myte to bring.",
} as const;

export type AttendanceValidation = { ok: true; body: AttendancePut } | { ok: false; errors: AttendanceErrors };

/** Whether another question box may be added. */
export function canAddQuestion(questions: readonly string[]): boolean {
  return questions.length < ATTENDANCE_LIMITS.questionsMax;
}

export function validateAttendance(draft: AttendanceDraft): AttendanceValidation {
  if (draft.attendance === "live") return { ok: true, body: { attendance: "live" } };

  const errors: AttendanceErrors = {};
  const update = draft.update.trim();
  if (update.length > ATTENDANCE_LIMITS.updateMax) errors.update = ATTENDANCE_MESSAGES.updateTooLong;

  const qErrors: Record<number, string> = {};
  const questions: string[] = [];
  draft.questions.forEach((q, i) => {
    const t = q.trim();
    if (!t) return;
    if (t.length > ATTENDANCE_LIMITS.questionMax) qErrors[i] = ATTENDANCE_MESSAGES.questionTooLong;
    else questions.push(t);
  });
  if (Object.keys(qErrors).length > 0) errors.questions = qErrors;
  const typed = draft.questions.filter((q) => q.trim()).length;
  if (typed > ATTENDANCE_LIMITS.questionsMax) errors.form = ATTENDANCE_MESSAGES.tooManyQuestions;
  else if (!update && typed === 0) errors.form = ATTENDANCE_MESSAGES.nothingToCarry;

  if (errors.update || errors.questions || errors.form) return { ok: false, errors };
  return { ok: true, body: { attendance: "agent", proxy_update: update || null, proxy_questions: questions } };
}

/** The draft for what the server has for you now. */
export function draftFrom(current: {
  attendance: Attendance;
  proxyUpdate: string | null;
  proxyQuestions: string[];
}): AttendanceDraft {
  return {
    attendance: current.attendance,
    update: current.proxyUpdate ?? "",
    questions: current.proxyQuestions.length > 0 ? [...current.proxyQuestions] : [""],
  };
}

/** Whether the draft differs from what is saved (to enable Save, and to warn before leaving). */
export function attendanceChanged(
  draft: AttendanceDraft,
  saved: { attendance: Attendance; proxyUpdate: string | null; proxyQuestions: string[] },
): boolean {
  if (draft.attendance !== saved.attendance) return true;
  if (draft.attendance === "live") return false;
  const qs = draft.questions.map((q) => q.trim()).filter(Boolean);
  return (
    draft.update.trim() !== (saved.proxyUpdate ?? "").trim() ||
    qs.length !== saved.proxyQuestions.length ||
    qs.some((q, i) => q !== saved.proxyQuestions[i])
  );
}
