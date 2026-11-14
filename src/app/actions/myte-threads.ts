"use server";

import { api, ApiError } from "@/lib/api/client";
import { fetchMeeting } from "@/lib/api/meeting";
import { paletteIndex } from "@/app/actions/palette";
import { createTask } from "@/app/actions/tasks";
import { addPromise } from "@/app/actions/promises";
import { setAttendance } from "@/app/actions/attendance";
import { replaceAgenda } from "@/app/actions/agenda";
import { loadStarters, readThread, readThreads } from "@/lib/ask-myte/server";
import { pageStarters, type Starter } from "@/lib/ask-myte/starters";
import type { Mentionable } from "@/lib/ask-myte/compose";
import type { AskPage, ProposalEvent, StoredMessage, Thread, ThreadList, ThreadSummary } from "@/lib/ask-myte/types";
import { LIMITS } from "@/lib/ask-myte/types";
import type { AgendaItem } from "@/lib/api/meeting-agenda-types";

/* Ask Myte's threads and actions (mytheus-docs ADR-0047 D4, D7). Threads are private to their
   owner: core-api filters every route on the caller, admins included, and answers 404 for anyone
   else's thread. Nothing about the user or the tenant is taken from the input.

   Confirming a proposal calls the SAME server actions the rest of the app uses (create a task,
   add a promise, set attendance, replace the agenda), so the write, its audit row and its events
   are identical to a manual one. The ADR gives no route to edit a stored message's payload, so a
   proposal's confirmed state lives in the browser after a confirm (see `AskMyte` for how it is
   kept across reloads); the write itself is the source of truth either way. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Fail = { ok: false; message: string; gone?: boolean; session?: boolean };
type Ok<T> = { ok: true } & T;

function failure(err: unknown, fallback: string): Fail {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again.", session: true };
    if (err.status === 404) return { ok: false, message: "That question is no longer in your history.", gone: true };
    if (err.status === 422) return { ok: false, message: "That wasn't accepted. Check it and try again." };
  }
  return { ok: false, message: fallback };
}

/* ---------------- threads ---------------- */

export async function listMyteThreads(input: { q?: string | null; cursor?: string | null } = {}): Promise<Ok<{ list: ThreadList }> | Fail> {
  const list = await readThreads(input.q ?? null, input.cursor ?? null);
  return list ? { ok: true, list } : { ok: false, message: "Your questions couldn't be loaded just now." };
}

export async function getMyteThread(id: string): Promise<Ok<{ thread: Thread }> | Fail> {
  const res = await readThread(id);
  if (res.ok) return { ok: true, thread: res.thread };
  return res.gone ? { ok: false, gone: true, message: "That question is no longer in your history." } : { ok: false, message: "That question couldn't be opened just now." };
}

export async function renameMyteThread(id: string, title: string): Promise<Ok<{ thread: ThreadSummary }> | Fail> {
  const clean = title.replace(/\s+/g, " ").trim();
  if (!UUID.test(id)) return { ok: false, message: "That question is no longer in your history.", gone: true };
  if (!clean) return { ok: false, message: "Give it a name." };
  if (clean.length > LIMITS.title) return { ok: false, message: `Keep the name under ${LIMITS.title} characters.` };
  try {
    const thread = await api<ThreadSummary>(`/api/v1/myte/threads/${id}`, { method: "PATCH", body: { title: clean } });
    return { ok: true, thread };
  } catch (err) {
    return failure(err, "Couldn't rename it just now. Try again.");
  }
}

export async function pinMyteThread(id: string, pinned: boolean): Promise<Ok<{ thread: ThreadSummary }> | Fail> {
  if (!UUID.test(id)) return { ok: false, message: "That question is no longer in your history.", gone: true };
  try {
    const thread = await api<ThreadSummary>(`/api/v1/myte/threads/${id}`, { method: "PATCH", body: { pinned: pinned === true } });
    return { ok: true, thread };
  } catch (err) {
    return failure(err, pinned ? "Couldn't pin it just now." : "Couldn't unpin it just now.");
  }
}

export async function deleteMyteThread(id: string): Promise<Ok<object> | Fail> {
  if (!UUID.test(id)) return { ok: true };
  try {
    await api<void>(`/api/v1/myte/threads/${id}`, { method: "DELETE" });
    return { ok: true };
  } catch (err) {
    // Already gone is what was asked for.
    if (err instanceof ApiError && err.status === 404) return { ok: true };
    return failure(err, "Couldn't delete it just now. Try again.");
  }
}

export async function deleteAllMyteThreads(): Promise<Ok<object> | Fail> {
  try {
    await api<void>("/api/v1/myte/threads", { method: "DELETE" });
    return { ok: true };
  } catch (err) {
    return failure(err, "Couldn't delete your questions just now. Try again.");
  }
}

export async function sendMyteFeedback(messageId: string, feedback: -1 | 0 | 1, reason: string | null = null): Promise<Ok<{ message: StoredMessage }> | Fail> {
  if (!UUID.test(messageId)) return { ok: false, message: "That answer isn't saved yet, so it can't take feedback." };
  if (feedback !== 1 && feedback !== -1 && feedback !== 0) return { ok: false, message: "Pick Helpful or Not helpful." };
  const why = reason?.trim() ? reason.trim().slice(0, LIMITS.feedbackReason) : null;
  try {
    const message = await api<StoredMessage>(`/api/v1/myte/messages/${messageId}`, {
      method: "PATCH",
      body: { feedback, ...(why && feedback === -1 ? { feedback_reason: why } : {}) },
    });
    return { ok: true, message };
  } catch (err) {
    return failure(err, "Your feedback couldn't be sent just now.");
  }
}

/* ---------------- starters and mentions ---------------- */

/** The six starters (or three page-aware ones), for the sheet. */
export async function myteStarters(page: AskPage | null = null): Promise<Starter[]> {
  const forPage = pageStarters(page);
  if (forPage.length) return forPage;
  try {
    return await loadStarters();
  } catch {
    return [];
  }
}

/** What `@` can mention: the caller's meetings, the workspace's people and the decision log,
    from the same reads the command palette uses. */
export async function myteMentions(): Promise<Mentionable[]> {
  const index = await paletteIndex().catch(() => null);
  if (!index) return [];
  const out: Mentionable[] = [];
  for (const m of index.meetings ?? []) out.push({ kind: "meeting", id: m.id, label: m.title, hint: m.start });
  for (const p of index.people ?? []) out.push({ kind: "person", id: p.id, label: p.name, hint: p.isYou ? "You" : p.email });
  for (const d of index.decisions ?? []) out.push({ kind: "decision", id: d.id, label: d.content.slice(0, 120), hint: d.meetingTitle });
  return out;
}

/* ---------------- proposals (D4) ---------------- */

export type ConfirmResult = Ok<{ done: string; href: string | null }> | Fail;

/**
 * Confirm one proposal, through the app's own write for its kind. `edits` are what the person
 * changed with Edit. The outcome's `done` is the toast ("Task added"); `href` is where it now is.
 */
export async function confirmMyteProposal(proposal: ProposalEvent, edits: { title?: string; due_date?: string | null; note?: string | null; choice?: ProposalEvent["choice"] } = {}, tz: string | null = null): Promise<ConfirmResult> {
  const title = (edits.title ?? proposal.title ?? "").replace(/\s+/g, " ").trim();
  const due = (edits.due_date !== undefined ? edits.due_date : proposal.due_date) ?? null;
  const dueDate = due && DATE.test(due.slice(0, 10)) ? due.slice(0, 10) : null;
  const note = (edits.note !== undefined ? edits.note : proposal.note)?.trim() || "";
  const meetingId = proposal.meeting_id && UUID.test(proposal.meeting_id) ? proposal.meeting_id : null;

  switch (proposal.kind) {
    case "task": {
      const res = await createTask({ content: title, dueDate });
      return res.ok ? { ok: true, done: "Task added", href: "/work/tasks" } : { ok: false, message: res.message };
    }
    case "promise": {
      const res = await addPromise({ content: title, dueAt: dueDate, recipientUserId: null, recipientLabel: null, sourceLink: null }, tz);
      return res.ok ? { ok: true, done: "Promise added", href: "/work/promises" } : { ok: false, message: res.message };
    }
    case "attendance": {
      if (!meetingId) return { ok: false, message: "I don't know which meeting this is for any more." };
      const choice = edits.choice ?? proposal.choice ?? "agent";
      if (choice === "skip") return { ok: false, message: "I can't mark a meeting as skipped for you yet. Open the meeting to decline it." };
      const res = await setAttendance(meetingId, {
        attendance: choice === "attend" ? "live" : "agent",
        update: choice === "agent" ? note || title : "",
        questions: [],
      });
      return res.ok
        ? { ok: true, done: choice === "attend" ? "You're attending" : "Your Myte will attend", href: `/meetings/${meetingId}` }
        : { ok: false, message: res.message };
    }
    case "agenda_item": {
      if (!meetingId) return { ok: false, message: "I don't know which meeting this is for any more." };
      if (!title) return { ok: false, message: "Give the agenda item a title." };
      const meeting = await fetchMeeting(meetingId).catch(() => null);
      if (!meeting) return { ok: false, message: "That meeting couldn't be read just now." };
      const agenda = (meeting as { agenda?: AgendaItem[] }).agenda;
      const current = Array.isArray(agenda) ? [...agenda].sort((a, b) => a.position - b.position) : [];
      const res = await replaceAgenda(meetingId, [
        ...current.map((it) => ({ id: it.id, title: it.title, owner_user_id: it.owner_user_id, duration_minutes: it.duration_minutes, goal_id: it.goal_id ?? null })),
        { title, owner_user_id: null, duration_minutes: null, goal_id: null },
      ]);
      return res.ok ? { ok: true, done: "Added to the agenda", href: `/meetings/${meetingId}` } : { ok: false, message: res.message };
    }
    default:
      return { ok: false, message: "I can't do that kind of thing yet." };
  }
}
