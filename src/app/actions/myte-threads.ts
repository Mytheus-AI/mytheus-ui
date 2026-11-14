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
import { createMeeting, inviteToMeeting } from "@/app/actions/meetings";
import { createDecisionShare, exportDecision } from "@/app/actions/decision-reach";
import { addMemory, askPeerQuestion } from "@/app/actions/myte-v2";
import { fetchDecisionLog } from "@/lib/api/decisions";
import { minutesBetween, proposalProblem } from "@/lib/ask-myte/proposals";
import type { Memory, PeerQuestion } from "@/lib/ask-myte/types";

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
  return list ? { ok: true, list } : { ok: false, message: "Your chats couldn't be loaded just now." };
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

/** What a confirmed write produced, for the card's success state (ADR-0049 F3). */
export type ConfirmOutcome =
  | { type: "meeting"; id: string }
  | { type: "share"; url: string }
  | { type: "exports"; urls: string[]; count: number; failed: number }
  | { type: "peer"; question: PeerQuestion }
  | { type: "memory"; memory: Memory }
  | { type: "invites"; added: number };

export type ConfirmResult = Ok<{ done: string; href: string | null; outcome?: ConfirmOutcome }> | Fail;

/** What Edit can change, beyond the event's own fields: where an export goes. */
export type ConfirmEdits = Partial<ProposalEvent> & { target?: string | null };

/**
 * Confirm one proposal, through the app's own write for its kind. `edits` are what the person
 * changed with Edit. The outcome's `done` is the toast ("Task added"); `href` is where it now is.
 */
export async function confirmMyteProposal(proposal: ProposalEvent, edits: ConfirmEdits = {}, tz: string | null = null, threadId: string | null = null): Promise<ConfirmResult> {
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
      return confirmV2({ ...proposal, ...stripUndefined(edits), title: title || proposal.title }, edits.target ?? null, threadId);
  }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/* ADR-0049 F3: the new kinds, each through the app's existing write for it. */
async function confirmV2(p: ProposalEvent, target: string | null, threadId: string | null): Promise<ConfirmResult> {
  const problem = proposalProblem(p);
  if (problem) return { ok: false, message: problem };
  switch (p.kind) {
    case "schedule_meeting": {
      const res = await createMeeting({
        title: p.title,
        scheduledStart: p.start as string,
        durationMinutes: minutesBetween(p.start, p.end),
        participantIds: p.attendee_ids ?? [],
      });
      return res.ok ? { ok: true, done: "Meeting scheduled", href: `/meetings/${res.id}`, outcome: { type: "meeting", id: res.id } } : { ok: false, message: res.message };
    }
    case "invite_people": {
      const res = await inviteToMeeting(p.meeting_id as string, p.user_ids ?? []);
      if (!res.ok) return { ok: false, message: res.message };
      return {
        ok: true,
        done: res.added === 0 ? "Already in the meeting" : `Added ${res.added === 1 ? "1 person" : `${res.added} people`}`,
        href: `/meetings/${p.meeting_id}`,
        outcome: { type: "invites", added: res.added },
      };
    }
    case "share_decision": {
      const res = await createDecisionShare(p.decision_id as string, p.meeting_id ?? "");
      return res.ok ? { ok: true, done: "Share link created", href: null, outcome: { type: "share", url: res.url } } : { ok: false, message: res.message };
    }
    case "export_decisions": {
      const provider = p.destination ?? "notion";
      if (provider !== "slack" && !target) return { ok: false, message: provider === "notion" ? "Pick the Notion page to put it under." : "Pick the Confluence space to put it in." };
      let decisions: { id: string; meetingId: string }[] = [];
      if (p.decision_ids?.length) {
        const log = await fetchDecisionLog().catch(() => null);
        decisions = p.decision_ids.map((id) => ({ id, meetingId: log?.find((d) => d.id === id)?.meetingId ?? p.meeting_id ?? "" }));
      } else if (p.meeting_id) {
        const log = await fetchDecisionLog().catch(() => null);
        if (!log) return { ok: false, message: "That meeting's decisions couldn't be read just now." };
        decisions = log.filter((d) => d.meetingId === p.meeting_id && d.status !== "superseded").map((d) => ({ id: d.id, meetingId: d.meetingId }));
      }
      if (!decisions.length) return { ok: false, message: "There are no confirmed decisions to export." };
      const results = await Promise.all(decisions.slice(0, 20).map((d) => exportDecision({ decisionId: d.id, meetingId: d.meetingId, provider, destination: provider === "slack" ? (target?.trim() || "dm") : (target as string) })));
      const done = results.filter((r): r is Extract<typeof r, { ok: true }> => r.ok);
      if (!done.length) {
        const first = results.find((r): r is Extract<typeof r, { ok: false }> => !r.ok);
        return { ok: false, message: first?.message ?? "The export didn't go through. Try again." };
      }
      const name = provider === "notion" ? "Notion" : provider === "confluence" ? "Confluence" : "Slack";
      return {
        ok: true,
        done: `Exported ${done.length === 1 ? "1 decision" : `${done.length} decisions`} to ${name}`,
        href: null,
        outcome: { type: "exports", urls: done.map((r) => r.url).filter((u): u is string => !!u), count: done.length, failed: results.length - done.length },
      };
    }
    case "ask_myte": {
      const res = await askPeerQuestion({ toUserId: p.person_id as string, question: p.question as string, threadId });
      return res.ok ? { ok: true, done: "Question sent", href: null, outcome: { type: "peer", question: res.question } } : { ok: false, message: res.message };
    }
    case "memory": {
      const res = await addMemory(p.text as string, threadId);
      return res.ok ? { ok: true, done: "Remembered", href: "/agent#myte-memory", outcome: { type: "memory", memory: res.memory } } : { ok: false, message: res.message };
    }
    case "slack_post":
      // No public route posts to Slack (integration-service only posts on its own triggers); the
      // card copies the message and opens Slack instead, so this is never called for it.
      return { ok: false, message: "Copy the message and post it in Slack yourself." };
    default:
      return { ok: false, message: "I can't do that kind of thing yet." };
  }
}
