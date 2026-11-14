"use server";

import { api, apiSafe, ApiError } from "@/lib/api/client";
import type { DashboardResponse } from "@/lib/api/types";
import { listMembers } from "@/lib/api/members";
import { fetchMyOpenTasks } from "@/lib/api/tasks";
import { fetchLedger } from "@/lib/api/promises";
import type { DestinationsLoad, ExportProvider } from "@/lib/decision-reach";
import { checkRoutineDraft, type RoutineDraft } from "@/lib/ask-myte/routines";
import type { AskScope, Memory, PeerQuestion, ProposalState, Routine } from "@/lib/ask-myte/types";
import { LIMITS } from "@/lib/ask-myte/types";

/* Ask Myte v2's own writes and reads (mytheus-docs ADR-0049): stored proposal states (R2), peer
   questions (F1), memories (F4), routines (F5), and the reads behind proposals, nudges and the
   attendee picker. Everything goes through core-api on the caller's own session; core-api scopes
   each route to its owner (or, for a peer question, to its asker and recipient). Nothing about
   the user or the tenant is taken from the input. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Fail = { ok: false; message: string; status?: number; session?: boolean };
type Ok<T> = { ok: true } & T;

function failure(err: unknown, fallback: string, map: Partial<Record<number, string>> = {}): Fail {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again.", session: true, status: err.status };
    const said = map[err.status];
    if (said) return { ok: false, message: said, status: err.status };
    if (err.status === 429) return { ok: false, message: "That's a lot in a short time. Try again in a minute.", status: 429 };
    return { ok: false, message: fallback, status: err.status };
  }
  return { ok: false, message: fallback };
}

const items = <T,>(raw: unknown): T[] => (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items) ? ((raw as { items: T[] }).items) : []);

/* ---------------- R2: proposal states ---------------- */

/** Store what the person did with an answer's proposals, so Confirm never reappears elsewhere. */
export async function setMyteProposalStates(messageId: string, states: Record<string, ProposalState>): Promise<Ok<object> | Fail> {
  if (!UUID.test(messageId)) return { ok: false, message: "That answer isn't saved yet." };
  const clean: Record<string, ProposalState> = {};
  for (const [k, v] of Object.entries(states ?? {})) {
    if (k && k.length <= 64 && (v === "confirmed" || v === "dismissed")) clean[k] = v;
    if (Object.keys(clean).length >= LIMITS.proposalStates) break;
  }
  if (!Object.keys(clean).length) return { ok: true };
  try {
    await api(`/api/v1/myte/messages/${messageId}`, { method: "PATCH", body: { proposal_states: clean } });
    return { ok: true };
  } catch (err) {
    return failure(err, "That couldn't be saved to your history.");
  }
}

/* ---------------- F1: peer questions ---------------- */

const PEER_ERRORS = {
  404: "That question is no longer there.",
  409: "That question was already answered or declined.",
  422: "That wasn't accepted. Check it and try again.",
};

export async function listPeerQuestions(box: "inbox" | "sent", status?: "pending" | "answered" | "declined"): Promise<Ok<{ items: PeerQuestion[] }> | Fail> {
  try {
    const res = await api<unknown>("/api/v1/myte/peer-questions", { query: { box, status, limit: 50 } });
    return { ok: true, items: items<PeerQuestion>(res) };
  } catch (err) {
    return failure(err, "Questions for your Myte couldn't be loaded just now.");
  }
}

export async function getPeerQuestion(id: string): Promise<Ok<{ question: PeerQuestion }> | Fail> {
  if (!UUID.test(id)) return { ok: false, message: "That question is no longer there.", status: 404 };
  try {
    return { ok: true, question: await api<PeerQuestion>(`/api/v1/myte/peer-questions/${id}`) };
  } catch (err) {
    return failure(err, "That question couldn't be opened just now.", PEER_ERRORS);
  }
}

export async function askPeerQuestion(input: { toUserId: string; question: string; threadId?: string | null }): Promise<Ok<{ question: PeerQuestion }> | Fail> {
  const q = input.question.replace(/\s+/g, " ").trim();
  if (!UUID.test(input.toUserId)) return { ok: false, message: "Pick who to ask." };
  if (!q) return { ok: false, message: "Write the question first." };
  if (q.length > LIMITS.peerQuestion) return { ok: false, message: `Keep the question under ${LIMITS.peerQuestion} characters.` };
  try {
    const question = await api<PeerQuestion>("/api/v1/myte/peer-questions", {
      method: "POST",
      body: { to_user_id: input.toUserId, question: q, ...(input.threadId && UUID.test(input.threadId) ? { thread_id: input.threadId } : {}) },
    });
    return { ok: true, question };
  } catch (err) {
    return failure(err, "The question couldn't be sent just now. Try again.", {
      404: "That person isn't in this workspace.",
      422: "You can have 20 questions waiting at once, and you can't ask your own Myte. Withdraw one that's waiting, or ask someone else.",
    });
  }
}

export async function answerPeerQuestion(id: string, answer: string): Promise<Ok<{ question: PeerQuestion }> | Fail> {
  const text = answer.trim();
  if (!UUID.test(id)) return { ok: false, message: "That question is no longer there." };
  if (!text) return { ok: false, message: "Write the answer first." };
  if (text.length > LIMITS.peerAnswer) return { ok: false, message: `Keep the answer under ${LIMITS.peerAnswer} characters.` };
  try {
    return { ok: true, question: await api<PeerQuestion>(`/api/v1/myte/peer-questions/${id}/answer`, { method: "POST", body: { answer: text } }) };
  } catch (err) {
    return failure(err, "Your answer couldn't be sent just now. Try again.", PEER_ERRORS);
  }
}

export async function declinePeerQuestion(id: string, reason: string | null): Promise<Ok<{ question: PeerQuestion }> | Fail> {
  if (!UUID.test(id)) return { ok: false, message: "That question is no longer there." };
  const why = reason?.trim().slice(0, LIMITS.declineReason) || null;
  try {
    return { ok: true, question: await api<PeerQuestion>(`/api/v1/myte/peer-questions/${id}/decline`, { method: "POST", body: why ? { reason: why } : {} }) };
  } catch (err) {
    return failure(err, "That couldn't be declined just now. Try again.", PEER_ERRORS);
  }
}

/** The asker takes back a question that is still waiting. */
export async function withdrawPeerQuestion(id: string): Promise<Ok<object> | Fail> {
  if (!UUID.test(id)) return { ok: true };
  try {
    await api<void>(`/api/v1/myte/peer-questions/${id}`, { method: "DELETE" });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { ok: true };
    return failure(err, "It couldn't be withdrawn just now.", { 409: "It was already answered, so it can't be withdrawn." });
  }
}

/* ---------------- F4: memories ---------------- */

export async function listMemories(): Promise<Ok<{ items: Memory[] }> | Fail> {
  try {
    return { ok: true, items: items<Memory>(await api<unknown>("/api/v1/myte/memories")) };
  } catch (err) {
    return failure(err, "What your Myte remembers couldn't be loaded just now.");
  }
}

export async function addMemory(text: string, sourceThreadId: string | null = null): Promise<Ok<{ memory: Memory }> | Fail> {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return { ok: false, message: "Write what your Myte should remember." };
  if (clean.length > LIMITS.memoryText) return { ok: false, message: `Keep it under ${LIMITS.memoryText} characters.` };
  try {
    const memory = await api<Memory>("/api/v1/myte/memories", {
      method: "POST",
      body: { text: clean, ...(sourceThreadId && UUID.test(sourceThreadId) ? { source_thread_id: sourceThreadId } : {}) },
    });
    return { ok: true, memory };
  } catch (err) {
    return failure(err, "That couldn't be remembered just now. Try again.", { 422: "Your Myte remembers up to 100 things. Delete one first." });
  }
}

export async function deleteMemory(id: string): Promise<Ok<object> | Fail> {
  if (!UUID.test(id)) return { ok: true };
  try {
    await api<void>(`/api/v1/myte/memories/${id}`, { method: "DELETE" });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { ok: true };
    return failure(err, "That couldn't be forgotten just now. Try again.");
  }
}

/* ---------------- F5: routines ---------------- */

const ROUTINE_ERRORS = { 404: "That routine is no longer there.", 422: "You can have up to 10 routines. Delete one first, or check the time zone." };

function cleanScope(scope: AskScope | null | undefined): AskScope | null {
  if (!scope || scope.kind === "all") return null;
  const id = (v: string | null) => (v && UUID.test(v) ? v : null);
  return {
    kind: scope.kind,
    meeting_id: scope.kind === "meeting" ? id(scope.meeting_id) : null,
    person_id: scope.kind === "person" ? id(scope.person_id) : null,
    as_of: scope.kind === "as_of" && scope.as_of && /^\d{4}-\d{2}-\d{2}/.test(scope.as_of) ? scope.as_of.slice(0, 10) : null,
    label: scope.label ? scope.label.slice(0, 200) : null,
  };
}

export async function listRoutines(): Promise<Ok<{ items: Routine[] }> | Fail> {
  try {
    return { ok: true, items: items<Routine>(await api<unknown>("/api/v1/myte/routines")) };
  } catch (err) {
    return failure(err, "Your routines couldn't be loaded just now.");
  }
}

export async function createRoutine(draft: RoutineDraft, scope: AskScope | null = null): Promise<Ok<{ routine: Routine }> | Fail> {
  const checked = checkRoutineDraft(draft);
  if (!checked.ok) return { ok: false, message: checked.message };
  const d = checked.value;
  try {
    const routine = await api<Routine>("/api/v1/myte/routines", {
      method: "POST",
      body: { question: d.question, cadence: d.cadence, ...(d.cadence === "weekly" ? { weekday: d.weekday } : {}), hour: d.hour, timezone: d.timezone, scope: cleanScope(scope) },
    });
    return { ok: true, routine };
  } catch (err) {
    return failure(err, "The routine couldn't be saved just now. Try again.", ROUTINE_ERRORS);
  }
}

export async function updateRoutine(id: string, patch: Partial<RoutineDraft> & { enabled?: boolean }): Promise<Ok<{ routine: Routine }> | Fail> {
  if (!UUID.test(id)) return { ok: false, message: "That routine is no longer there." };
  const body: Record<string, unknown> = {};
  if (patch.question !== undefined || patch.cadence !== undefined) {
    const checked = checkRoutineDraft({
      question: patch.question ?? "x",
      cadence: patch.cadence ?? "daily",
      weekday: patch.weekday ?? null,
      hour: patch.hour ?? 9,
      timezone: patch.timezone ?? "UTC",
    });
    if (!checked.ok) return { ok: false, message: checked.message };
    if (patch.question !== undefined) body.question = checked.value.question;
    if (patch.cadence !== undefined) {
      body.cadence = checked.value.cadence;
      if (checked.value.cadence === "weekly") body.weekday = checked.value.weekday;
    }
  }
  if (patch.hour !== undefined) body.hour = patch.hour;
  if (patch.timezone !== undefined) body.timezone = patch.timezone;
  if (patch.enabled !== undefined) body.enabled = patch.enabled === true;
  try {
    return { ok: true, routine: await api<Routine>(`/api/v1/myte/routines/${id}`, { method: "PATCH", body }) };
  } catch (err) {
    return failure(err, "The routine couldn't be changed just now. Try again.", ROUTINE_ERRORS);
  }
}

export async function deleteRoutine(id: string): Promise<Ok<object> | Fail> {
  if (!UUID.test(id)) return { ok: true };
  try {
    await api<void>(`/api/v1/myte/routines/${id}`, { method: "DELETE" });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { ok: true };
    return failure(err, "The routine couldn't be deleted just now. Try again.");
  }
}

export async function dueRoutines(): Promise<Routine[]> {
  const res = await apiSafe<unknown>("/api/v1/myte/routines/due");
  return res.ok ? items<Routine>(res.data) : [];
}

export async function markRoutineRan(id: string, threadId: string): Promise<Ok<{ routine: Routine }> | Fail> {
  if (!UUID.test(id) || !UUID.test(threadId)) return { ok: false, message: "That run couldn't be recorded." };
  try {
    return { ok: true, routine: await api<Routine>(`/api/v1/myte/routines/${id}/ran`, { method: "POST", body: { thread_id: threadId } }) };
  } catch (err) {
    return failure(err, "That run couldn't be recorded.");
  }
}

/* ---------------- reads behind proposals ---------------- */

export type PickMember = { id: string; name: string; email: string };

/** Workspace members for the attendee and invite pickers, or null when they couldn't be read. */
export async function myteMembers(): Promise<PickMember[] | null> {
  const list = await listMembers().catch(() => null);
  return list ? list.map((m) => ({ id: m.id, name: m.name, email: m.email })) : null;
}

/** Whether a tool is connected, and where an export can go (Notion pages, Confluence spaces). */
export async function myteReach(provider: ExportProvider): Promise<DestinationsLoad> {
  const res = await apiSafe<{ configured: boolean; connected: boolean; destinations: { id: string; name: string; kind: "page" | "space" | "dm"; url?: string | null }[]; note?: string | null }>(
    "/integrations/exports/destinations",
    { query: { provider } },
  );
  if (!res.ok) return { kind: "unavailable" };
  return {
    kind: "live",
    configured: res.data.configured,
    connected: res.data.connected,
    destinations: (res.data.destinations ?? []).map((d) => ({ id: d.id, name: d.name, kind: d.kind, url: d.url ?? null })),
    note: res.data.note ?? null,
  };
}

/* ---------------- F2: what the nudges are built from ---------------- */

export type NudgeData = {
  meetings: { id: string; title: string; start: string | null; status: string | null }[] | null;
  tasks: { id: string; title: string; due_date: string | null }[] | null;
  promises: { id: string; title: string; due_at: string | null }[] | null;
  decisions: { id: string; content: string; created_at: string }[] | null;
  peerQuestions: { id: string; from_name: string; question: string }[] | null;
};

/** The same reads Home already makes (dashboard, tasks, promises) plus questions waiting for
    your Myte. Each arm is null on its own failure. */
export async function myteNudgeData(): Promise<NudgeData> {
  const [dashboard, tasks, ledger, peers] = await Promise.all([
    apiSafe<DashboardResponse>("/bff/dashboard"),
    fetchMyOpenTasks().catch(() => null),
    fetchLedger().catch(() => null),
    apiSafe<unknown>("/api/v1/myte/peer-questions", { query: { box: "inbox", status: "pending", limit: 20 } }),
  ]);
  const meetingsArm = dashboard.ok && dashboard.data.upcoming_meetings?.status !== "degraded" ? dashboard.data.upcoming_meetings.items : null;
  const decisionsArm = dashboard.ok && dashboard.data.decisions?.status !== "degraded" ? dashboard.data.decisions.items : null;
  return {
    meetings: meetingsArm?.map((m) => ({ id: m.id, title: m.title ?? "", start: m.scheduled_start ?? null, status: m.status ?? null })) ?? null,
    tasks: tasks && !tasks.failed ? tasks.items.map((t) => ({ id: t.id, title: t.content, due_date: t.due_date ?? null })) : null,
    promises: ledger ? ledger.items.filter((p) => p.status === "open").map((p) => ({ id: p.id, title: p.content, due_at: p.due_at })) : null,
    decisions: decisionsArm?.map((d) => ({ id: d.id, content: d.content, created_at: d.created_at })) ?? null,
    peerQuestions: peers.ok ? items<PeerQuestion>(peers.data).map((q) => ({ id: q.id, from_name: q.from_user?.name ?? "A teammate", question: q.question })) : null,
  };
}
