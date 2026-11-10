/**
 * Turns the ADR-0039 screen reads (`/bff/meetings/{id}/brief`, `/health`, `/catch-up`) and the
 * meeting-type, goal and agenda-draft reads into the hand-written shapes in
 * `meeting-brain-types.ts`. Defensive on purpose: a field the server leaves out becomes an empty
 * list or null, never a crash, and a value of the wrong type is dropped rather than rendered.
 *
 * Pure, no imports beyond types, so the node test runner can read it.
 */

import type { AgendaItem, AgendaStatus } from "./meeting-agenda-types.ts";
import type {
  BriefAction,
  CatchUpAgendaItem,
  DraftSource,
  DraftedAgendaItem,
  HealthTrendPoint,
  LatestStatus,
  MeetingBrief,
  MeetingCatchUp,
  MeetingHealth,
  MeetingTemplate,
  OrgGoal,
} from "./meeting-brain-types.ts";

type Obj = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: ReadonlySet<string> = new Set(["pending", "in_progress", "covered", "skipped"]);
const SOURCES: ReadonlySet<string> = new Set(["template", "unfinished", "open_action"]);

export const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
export const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
export const uuid = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const count = (v: unknown): number => Math.max(0, Math.round(num(v) ?? 0));

function latestStatus(v: unknown): LatestStatus | null {
  const o = obj(v);
  const t = text(o?.text);
  return o && t ? { text: t, answered_at: text(o.answered_at) } : null;
}

function agendaItem(v: unknown, i: number): AgendaItem | null {
  const o = obj(v);
  const id = text(o?.id);
  const title = text(o?.title);
  if (!o || !id || !title) return null;
  const status = typeof o.status === "string" && STATUSES.has(o.status) ? (o.status as AgendaStatus) : "pending";
  return {
    id,
    position: num(o.position) ?? i,
    title,
    owner_user_id: uuid(o.owner_user_id),
    duration_minutes: num(o.duration_minutes),
    status,
    status_source: o.status_source === "agent" || o.status_source === "host" ? o.status_source : null,
    agent_note: text(o.agent_note),
    updated_at: text(o.updated_at) ?? "",
    goal_id: uuid(o.goal_id),
  };
}

function briefAction(v: unknown): BriefAction | null {
  const o = obj(v);
  const id = text(o?.id);
  const title = text(o?.title);
  if (!o || !id || !title) return null;
  return {
    id,
    title,
    owner_user_id: uuid(o.owner_user_id),
    due_date: text(o.due_date),
    latest_status: latestStatus(o.latest_status),
  };
}

/** `GET /bff/meetings/{id}/brief`, or null when the body is not a brief at all. */
export function toBrief(raw: unknown): MeetingBrief | null {
  const o = obj(raw);
  const m = obj(o?.meeting);
  if (!o || !m || !text(m.id)) return null;
  const prev = obj(o.previous_meeting);
  return {
    meeting: { id: String(m.id), title: text(m.title) ?? "Untitled meeting", scheduled_start: text(m.scheduled_start) },
    my_agenda_items: list(o.my_agenda_items)
      .map(agendaItem)
      .filter((x): x is AgendaItem => x !== null),
    my_open_actions: list(o.my_open_actions)
      .map(briefAction)
      .filter((x): x is BriefAction => x !== null),
    saved_questions: list(o.saved_questions).flatMap((q) => {
      const qo = obj(q);
      const id = text(qo?.id);
      const question = text(qo?.question);
      return id && question ? [{ id, question }] : [];
    }),
    proxies: list(o.proxies).flatMap((p) => {
      const po = obj(p);
      const user_id = uuid(po?.user_id);
      return user_id ? [{ user_id, proxy_update: text(po?.proxy_update) }] : [];
    }),
    previous_meeting: prev && text(prev.id) ? { id: String(prev.id), title: text(prev.title) ?? "The earlier meeting" } : null,
  };
}

/** A share as a fraction 0..1, whether the server sent 0.42 or 42. */
function fraction(v: unknown): number | null {
  const n = num(v);
  if (n === null || n < 0) return null;
  return n > 1 ? Math.min(1, n / 100) : n;
}

function trendPoint(v: unknown): HealthTrendPoint | null {
  const o = obj(v);
  const id = text(o?.meeting_id);
  if (!o || !id) return null;
  return {
    meeting_id: id,
    title: text(o.title) ?? "Untitled meeting",
    scheduled_start: text(o.scheduled_start),
    coverage: fraction(o.coverage),
    decisions: count(o.decisions),
  };
}

/** `GET /bff/meetings/{id}/health`, or null when the body is not a health read. */
export function toHealth(raw: unknown): MeetingHealth | null {
  const o = obj(raw);
  if (!o) return null;
  const agenda = obj(o.agenda);
  const balance = Array.isArray(o.talk_balance)
    ? o.talk_balance.flatMap((b) => {
        const bo = obj(b);
        const user_id = text(bo?.user_id);
        const share = fraction(bo?.share);
        return user_id && share !== null ? [{ user_id, share }] : [];
      })
    : null;
  return {
    duration_minutes: count(o.duration_minutes),
    people_hours: Math.max(0, num(o.people_hours) ?? 0),
    agenda: { covered: count(agenda?.covered), total: count(agenda?.total) },
    decisions: count(o.decisions),
    actions: count(o.actions),
    talk_balance: balance && balance.length > 0 ? balance : null,
    async_suggestion: o.async_suggestion === true,
    trend: list(o.trend)
      .map(trendPoint)
      .filter((x): x is HealthTrendPoint => x !== null)
      .slice(0, 7),
  };
}

function catchUpItem(v: unknown, i: number): CatchUpAgendaItem | null {
  const a = agendaItem(v, i);
  return a ? { id: a.id, title: a.title, owner_user_id: a.owner_user_id, status: a.status, agent_note: a.agent_note } : null;
}

/** `GET /bff/meetings/{id}/catch-up`, or null when the body is not a catch-up. */
export function toCatchUp(raw: unknown): MeetingCatchUp | null {
  const o = obj(raw);
  if (!o) return null;
  const m = obj(o.meeting);
  return {
    meeting: m && text(m.id) ? { id: String(m.id), title: text(m.title) ?? "Untitled meeting", scheduled_start: text(m.scheduled_start) } : null,
    agenda: list(o.agenda)
      .map(catchUpItem)
      .filter((x): x is CatchUpAgendaItem => x !== null),
    decisions: list(o.decisions).flatMap((d) => {
      const dobj = obj(d);
      const id = text(dobj?.id);
      const content = text(dobj?.content);
      return id && content ? [{ id, content }] : [];
    }),
    assigned_to_me: list(o.assigned_to_me).flatMap((a) => {
      const ao = obj(a);
      const id = text(ao?.id);
      const title = text(ao?.title) ?? text(ao?.content);
      return id && title ? [{ id, title, due_date: text(ao?.due_date) }] : [];
    }),
    my_notes: list(o.my_notes).flatMap((n) => {
      const no = obj(n);
      const id = text(no?.id);
      const content = text(no?.content);
      return id && content ? [{ id, content, created_at: text(no?.created_at) }] : [];
    }),
    my_questions: list(o.my_questions).flatMap((q) => {
      const t = typeof q === "string" ? text(q) : text(obj(q)?.question);
      return t ? [t] : [];
    }),
  };
}

/** `GET /api/v1/meeting-templates` (a list, or `{items}`). */
export function toTemplates(raw: unknown): MeetingTemplate[] {
  const items = Array.isArray(raw) ? raw : list(obj(raw)?.items);
  return items.flatMap((t) => {
    const o = obj(t);
    const id = uuid(o?.id);
    const name = text(o?.name);
    if (!o || !id || !name) return [];
    const minutes = num(o.default_duration_minutes);
    return [
      {
        id,
        name,
        description: text(o.description),
        default_duration_minutes: minutes && minutes >= 5 && minutes <= 480 ? Math.round(minutes) : 30,
        agenda: list(o.agenda)
          .flatMap((a) => {
            const ao = obj(a);
            const title = text(ao?.title);
            const m = num(ao?.duration_minutes);
            return title ? [{ title, duration_minutes: m && m >= 1 && m <= 240 ? Math.round(m) : null }] : [];
          })
          .slice(0, 20),
        confidential: o.confidential === true,
      },
    ];
  });
}

/** `GET /api/v1/org/goals` (a list, or `{items}`): the active ones, in their order. */
export function toActiveGoals(raw: unknown): OrgGoal[] {
  const items = Array.isArray(raw) ? raw : list(obj(raw)?.items);
  return items
    .flatMap((g, i) => {
      const o = obj(g);
      const id = uuid(o?.id);
      const title = text(o?.title);
      if (!o || !id || !title || o.status !== "active") return [];
      return [{ goal: { id, title, period: text(o.period), status: "active" as const }, pos: num(o.position) ?? i }];
    })
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.goal);
}

/** `POST /api/v1/meetings/agenda-draft` (B4): its items, at most 20, in the server's order. */
export function toDraftedAgenda(raw: unknown): DraftedAgendaItem[] {
  return list(obj(raw)?.items)
    .flatMap((it) => {
      const o = obj(it);
      const title = text(o?.title);
      if (!o || !title) return [];
      const m = num(o.duration_minutes);
      return [
        {
          title,
          owner_user_id: uuid(o.owner_user_id),
          duration_minutes: m && m >= 1 && m <= 240 ? Math.round(m) : null,
          goal_id: uuid(o.goal_id),
          source: (typeof o.source === "string" && SOURCES.has(o.source) ? o.source : "template") as DraftSource,
        },
      ];
    })
    .slice(0, 20);
}
