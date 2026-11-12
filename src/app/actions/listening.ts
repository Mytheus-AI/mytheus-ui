"use server";

import { revalidatePath } from "next/cache";

import { api, ApiError } from "@/lib/api/client";
import type {
  AttendanceChoice,
  AttendanceRuleResult,
  AttendanceRuleWrite,
  Interruption,
  ListeningPreferences,
  ListeningPreferencesView,
  MeetingAttendanceChoice,
  MeetingView,
  MeetingViewList,
  StandingPosition,
} from "@/lib/api/listening-types";
import { CHOICES, focusBlockError, isUuid, MAX_HOLD, MAX_POSITION, MAX_VIEW } from "@/lib/listening";

/* "In every meeting at once" writes (Beyond the meeting, Layer 3). Every call is the caller's
   own: core-api takes the person from the session, never from this input, refuses anyone not
   invited (403) and another workspace's ids (404). Each action checks its input the way the
   server does, so a hand-made call cannot send past the limits, and answers plain words. */

export type Result<T> = { ok: true; data: T } | { ok: false; message: string; status?: number };

function fail(err: unknown, fallback: string, known: Record<number, string> = {}): { ok: false; message: string; status?: number } {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again.", status: err.status };
    if (known[err.status]) return { ok: false, message: known[err.status], status: err.status };
    if (err.status === 403) return { ok: false, message: "Only people invited to this meeting can do that.", status: 403 };
    if (err.status === 404) return { ok: false, message: "That is no longer there.", status: 404 };
  }
  return { ok: false, message: fallback };
}

const refreshListening = () => {
  revalidatePath("/meetings/listening");
};

/* ---------------- per-meeting choice ---------------- */

export async function setAttendanceChoice(meetingId: string, choice: AttendanceChoice): Promise<Result<MeetingAttendanceChoice>> {
  if (!isUuid(meetingId) || !CHOICES.includes(choice)) return { ok: false, message: "That meeting no longer exists." };
  try {
    const data = await api<MeetingAttendanceChoice>(`/api/v1/meetings/${meetingId}/attendance-choice`, { method: "PUT", body: { choice } });
    refreshListening();
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't save your choice just now. Try again in a moment.", {
      409: "This meeting is over, so who attends can no longer change.",
      422: "This meeting is confidential, so no Myte listens to it. Attend or skip.",
    });
  }
}

/** Back to what your rules say (the Undo of a choice). */
export async function clearAttendanceChoice(meetingId: string): Promise<Result<MeetingAttendanceChoice>> {
  if (!isUuid(meetingId)) return { ok: false, message: "That meeting no longer exists." };
  try {
    const data = await api<MeetingAttendanceChoice>(`/api/v1/meetings/${meetingId}/attendance-choice`, { method: "DELETE" });
    refreshListening();
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't undo that just now. Try again in a moment.", { 409: "This meeting is over, so who attends can no longer change." });
  }
}

/* ---------------- rules ---------------- */

function cleanRule(input: AttendanceRuleWrite): AttendanceRuleWrite | string {
  if (!CHOICES.includes(input?.choice)) return "Pick what should happen.";
  const title = (input.title_contains ?? "").replace(/\s+/g, " ").trim();
  if (title && (title.length < 2 || title.length > 80)) return "A title match is 2 to 80 characters.";
  const template = input.template_id && isUuid(input.template_id) ? input.template_id : null;
  const recurring = input.recurring_only === true;
  if (!title && !template && !recurring) return "Say which meetings: a title, a meeting type, or recurring meetings.";
  return {
    choice: input.choice,
    title_contains: title || null,
    template_id: template,
    recurring_only: recurring,
    include_hosted: input.include_hosted === true,
  };
}

export async function saveAttendanceRule(ruleId: string | null, input: AttendanceRuleWrite): Promise<Result<AttendanceRuleResult>> {
  const body = cleanRule(input);
  if (typeof body === "string") return { ok: false, message: body };
  if (ruleId !== null && !isUuid(ruleId)) return { ok: false, message: "That rule no longer exists." };
  try {
    const data = await api<AttendanceRuleResult>(ruleId ? `/api/v1/listening/rules/${ruleId}` : "/api/v1/listening/rules", {
      method: ruleId ? "PUT" : "POST",
      body,
    });
    refreshListening();
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't save the rule just now. Try again in a moment.", {
      422: "That rule wasn't accepted. You can keep up to 20 rules, each matching something.",
    });
  }
}

export async function deleteAttendanceRule(ruleId: string): Promise<Result<null>> {
  if (!isUuid(ruleId)) return { ok: false, message: "That rule no longer exists." };
  try {
    await api<void>(`/api/v1/listening/rules/${ruleId}`, { method: "DELETE" });
    refreshListening();
    return { ok: true, data: null };
  } catch (err) {
    return fail(err, "Couldn't remove the rule just now. Try again in a moment.");
  }
}

/* ---------------- preferences ---------------- */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveListeningPreferences(input: ListeningPreferences): Promise<Result<ListeningPreferencesView>> {
  const quietStart = input.quiet_start || null;
  const quietEnd = input.quiet_end || null;
  if ((quietStart === null) !== (quietEnd === null)) return { ok: false, message: "Quiet hours need both a start and an end." };
  if (quietStart && (!HHMM.test(quietStart) || !HHMM.test(quietEnd ?? ""))) return { ok: false, message: "Use times like 22:00 for quiet hours." };
  if (quietStart && quietStart === quietEnd) return { ok: false, message: "Quiet hours start and end at different times." };
  const blocks = (input.focus_blocks ?? []).map((b) => ({ days: [...b.days], start: b.start, end: b.end, label: b.label?.trim() || null }));
  if (blocks.length > 14) return { ok: false, message: "Keep it to 14 focus blocks." };
  const bad = blocks.map(focusBlockError).find(Boolean);
  if (bad) return { ok: false, message: bad };
  const body: ListeningPreferences = {
    interruptions_enabled: input.interruptions_enabled !== false,
    max_per_hour: Math.min(12, Math.max(1, Math.round(Number(input.max_per_hour) || 3))),
    quiet_start: quietStart,
    quiet_end: quietEnd,
    focus_blocks: blocks,
    never_during_focus: input.never_during_focus !== false,
    digest_enabled: input.digest_enabled !== false,
    digest_hour: Math.min(23, Math.max(0, Math.round(Number(input.digest_hour) || 0))),
    time_zone: (input.time_zone || "UTC").slice(0, 64),
  };
  try {
    const data = await api<ListeningPreferencesView>("/api/v1/listening/preferences", { method: "PUT", body });
    revalidatePath("/settings/listening");
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't save these settings just now. Try again in a moment.", {
      422: "Some settings weren't accepted. Check the time zone, quiet hours and focus blocks.",
    });
  }
}

/* ---------------- positions (the line you gave your Myte) ---------------- */

export async function listPositions(): Promise<Result<StandingPosition[]>> {
  try {
    const body = await api<{ items: StandingPosition[] }>("/api/v1/listening/positions");
    return { ok: true, data: body.items ?? [] };
  } catch (err) {
    return fail(err, "Couldn't load your lines just now.");
  }
}

export async function savePosition(positionId: string | null, input: { topic: string | null; text: string }): Promise<Result<StandingPosition>> {
  const text = (input?.text ?? "").replace(/\s+/g, " ").trim();
  const topic = (input?.topic ?? "").replace(/\s+/g, " ").trim() || null;
  if (!text) return { ok: false, message: "Write the line your Myte may hold." };
  if (text.length > MAX_POSITION) return { ok: false, message: `Keep a line under ${MAX_POSITION} characters.` };
  if (topic && topic.length > 80) return { ok: false, message: "Keep the topic under 80 characters." };
  if (positionId !== null && !isUuid(positionId)) return { ok: false, message: "That line no longer exists." };
  try {
    const data = await api<StandingPosition>(positionId ? `/api/v1/listening/positions/${positionId}` : "/api/v1/listening/positions", {
      method: positionId ? "PUT" : "POST",
      body: { topic, text },
    });
    revalidatePath("/settings/listening");
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't save that line just now. Try again in a moment.", { 422: "You can keep up to 25 lines. Remove one first." });
  }
}

export async function deletePosition(positionId: string): Promise<Result<null>> {
  if (!isUuid(positionId)) return { ok: false, message: "That line no longer exists." };
  try {
    await api<void>(`/api/v1/listening/positions/${positionId}`, { method: "DELETE" });
    revalidatePath("/settings/listening");
    return { ok: true, data: null };
  } catch (err) {
    return fail(err, "Couldn't remove that line just now. Try again in a moment.");
  }
}

/* ---------------- answering an interruption ---------------- */

const NOT_LIVE = { 409: "That meeting has ended, so there is nothing to join or say." };

export async function joinFromInterruption(interruptionId: string): Promise<Result<Interruption>> {
  if (!isUuid(interruptionId)) return { ok: false, message: "That interruption no longer exists." };
  try {
    const data = await api<Interruption>(`/api/v1/listening/interruptions/${interruptionId}/join`, { method: "POST" });
    refreshListening();
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't open the meeting just now. Try again in a moment.", NOT_LIVE);
  }
}

export async function dismissInterruption(interruptionId: string): Promise<Result<Interruption>> {
  if (!isUuid(interruptionId)) return { ok: false, message: "That interruption no longer exists." };
  try {
    const data = await api<Interruption>(`/api/v1/listening/interruptions/${interruptionId}/dismiss`, { method: "POST" });
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't save that just now.");
  }
}

export async function sendView(interruptionId: string, text: string): Promise<Result<MeetingView>> {
  const body = (text ?? "").trim();
  if (!isUuid(interruptionId)) return { ok: false, message: "That interruption no longer exists." };
  if (!body) return { ok: false, message: "Write your view first." };
  if (body.length > MAX_VIEW) return { ok: false, message: `Keep your view under ${MAX_VIEW} characters.` };
  try {
    const data = await api<MeetingView>(`/api/v1/listening/interruptions/${interruptionId}/view`, { method: "POST", body: { text: body } });
    refreshListening();
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't send your view just now. Try again in a moment.", NOT_LIVE);
  }
}

export async function holdTheLine(interruptionId: string, positionIds: string[]): Promise<Result<MeetingView>> {
  const ids = Array.from(new Set((positionIds ?? []).filter(isUuid)));
  if (!isUuid(interruptionId)) return { ok: false, message: "That interruption no longer exists." };
  if (ids.length === 0) return { ok: false, message: "Pick at least one of your lines." };
  if (ids.length > MAX_HOLD) return { ok: false, message: `Pick up to ${MAX_HOLD} lines.` };
  try {
    const data = await api<MeetingView>(`/api/v1/listening/interruptions/${interruptionId}/hold`, {
      method: "POST",
      body: { position_ids: ids },
    });
    refreshListening();
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Couldn't hand your line to your Myte just now. Try again in a moment.", {
      ...NOT_LIVE,
      422: "Only your own saved lines can be held. Refresh and pick again.",
    });
  }
}

/* ---------------- views in the room (the host's call) ---------------- */

export async function loadMeetingViews(meetingId: string): Promise<Result<MeetingViewList>> {
  if (!isUuid(meetingId)) return { ok: false, message: "That meeting no longer exists." };
  try {
    return { ok: true, data: await api<MeetingViewList>(`/api/v1/meetings/${meetingId}/views`) };
  } catch (err) {
    return fail(err, "Couldn't load views just now.");
  }
}

export async function decideMeetingView(meetingId: string, viewId: string, verdict: "share" | "dismiss"): Promise<Result<MeetingView>> {
  if (!isUuid(meetingId) || !isUuid(viewId)) return { ok: false, message: "That view no longer exists." };
  try {
    const data = await api<MeetingView>(`/api/v1/meetings/${meetingId}/views/${viewId}/${verdict === "share" ? "share" : "dismiss"}`, {
      method: "POST",
    });
    return { ok: true, data };
  } catch (err) {
    return fail(err, verdict === "share" ? "Couldn't share that view just now." : "Couldn't set that view aside just now.", {
      403: "Only the host shares a view with the room.",
    });
  }
}
