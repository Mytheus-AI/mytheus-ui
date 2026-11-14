/**
 * Ask Myte's server-side reads (ADR-0047 D7 and the plan's personalised starters): the caller's
 * private threads on core-api and the real-week data the starters are built from. Each read
 * degrades on its own: a failed one gives null, and the page still renders.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api, apiSafe, ApiError } from "@/lib/api/client";
import type { DashboardResponse } from "@/lib/api/types";
import { fetchMyOpenTasks } from "@/lib/api/tasks";
import { fetchLedger } from "@/lib/api/promises";
import { viewerTimeZone } from "@/lib/timezone-server";
import { buildStarters, dayIn, weekOf, type Starter } from "./starters";
import type { Thread, ThreadList } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ThreadRead = { ok: true; thread: Thread } | { ok: false; gone: boolean };

export async function readThread(id: string): Promise<ThreadRead> {
  if (!UUID.test(id)) return { ok: false, gone: true };
  try {
    const thread = await api<Thread>(`/api/v1/myte/threads/${id}`);
    return { ok: true, thread: { ...thread, messages: Array.isArray(thread?.messages) ? thread.messages : [] } };
  } catch (err) {
    return { ok: false, gone: err instanceof ApiError && err.status === 404 };
  }
}

export async function readThreads(q?: string | null, cursor?: string | null): Promise<ThreadList | null> {
  const res = await apiSafe<ThreadList>("/api/v1/myte/threads", {
    query: { limit: 30, q: q?.trim() ? q.trim().slice(0, 200) : undefined, cursor: cursor || undefined },
  });
  if (!res.ok) return null;
  return { items: Array.isArray(res.data?.items) ? res.data.items : [], next_cursor: res.data?.next_cursor ?? null };
}

/** The six starters, from the caller's own dashboard, tasks and promises. */
export async function loadStarters(): Promise<Starter[]> {
  const timeZone = viewerTimeZone();
  const now = new Date();
  const [dashboard, tasks, ledger] = await Promise.all([
    apiSafe<DashboardResponse>("/bff/dashboard"),
    fetchMyOpenTasks(),
    fetchLedger().catch(() => null),
  ]);
  const meetings = dashboard.ok && dashboard.data.upcoming_meetings?.status !== "degraded" ? dashboard.data.upcoming_meetings.items : null;
  const nowMs = now.getTime();
  const next =
    meetings?.find((m) => m.status === "live") ??
    meetings?.find((m) => m.status === "scheduled" && m.scheduled_start && Date.parse(m.scheduled_end ?? m.scheduled_start) >= nowMs) ??
    null;
  const decisions = dashboard.ok && dashboard.data.decisions?.status !== "degraded" ? dashboard.data.decisions.items : null;
  const week = weekOf(dayIn(now, timeZone));
  const promises = ledger
    ? ledger.items.filter((p) => p.status === "open" && (!p.due_at || p.due_at.slice(0, 10) <= week.end)).length
    : null;
  return buildStarters({
    now,
    timeZone,
    nextMeeting: next ? { title: next.title || "your next meeting", start: next.scheduled_start, live: next.status === "live" } : null,
    openTasks: tasks.failed ? null : tasks.items.map((t) => ({ due_date: (t as { due_date?: string | null }).due_date ?? null })),
    openPromises: promises,
    decisions: decisions?.map((d) => ({ content: d.content, meeting_title: d.meeting_title, created_at: d.created_at })) ?? null,
  });
}
