/**
 * ProactiveAgent alerts in the meeting room (Phase P11, plan 10-13 section 3.9; P11 contract
 * sections 1, 4 and 5).
 *
 * An alert is something the agent noticed that this participant should act on: a new decision
 * that contradicts an earlier one (conflict, priority 1, red), someone being overloaded or an
 * action blocked by an open one (workload / dependency, priority 2, yellow), or a person who
 * owns decisions on the topic but is not in the room (missing_stakeholder, priority 3, blue).
 * Private: `realtime-gateway` sends "agent-alert" only to the recipient's sockets, and
 * notification-service serves only the caller's own rows. Two sources, merged by alert id:
 *   - live: "agent-alert" { meetingId, payload: { id, meetingId, alertType, priority, title,
 *     body, confidence, rationale, subject, related, link, createdAt } }, drained from the
 *     user's priority queue most urgent first;
 *   - re-hydrate: `GET /notifications?meeting_id=` on every (re)connect, through
 *     `/api/meeting-alerts`, whose rows carry status ("unread" | "read" | "dismissed").
 *
 * The id is the same in both (uuid5 over the alert's subject and recipient). An alert dismissed
 * here, or that the server says is dismissed, is remembered in `dismissed` and never comes back.
 * Order is priority first, then time: a red conflict sorts above everything regardless of when it
 * arrived. The sidebar pins priority-1 alerts as the banner and renders the rest as cards.
 *
 * ADR-0039 C7 adds two types:
 *   - `already_decided`: the room is re-opening a question the org already settled. The original
 *     decision is kept as `decided`. Live, realtime-gateway sends it camelCased beside the usual
 *     fields (`decisionId`, `decisionContent`, optional `decidedAt`, `meetingTitle`); the
 *     notification row's alert object has it in snake_case (`decision_id`, `decision_content`,
 *     `decided_at`, `meeting_id`, `meeting_title`). The live copy has no id for the decision's
 *     meeting (its `meetingId` is the room's), so the re-hydrated row fills that in.
 *   - `topic_watch`: a meeting you are not in is discussing a topic you watch (`topic`, optional
 *     `snippet` and `meetingTitle`). Kept as `watch`. Mostly for the notifications list, since a
 *     watcher is rarely in the meeting.
 */

import type { AlreadyDecided } from "../api/meeting-brain-types.ts";

export type AlertType =
  | "conflict"
  | "workload"
  | "dependency"
  | "missing_stakeholder"
  | "already_decided"
  | "topic_watch";

/** What a `topic_watch` alert is about (ADR-0039 C7). */
export interface TopicWatchHit {
  topic: string;
  snippet: string | null;
  meetingTitle: string | null;
}
export type AlertPriority = 1 | 2 | 3;
export type AlertStatus = "unread" | "read";

export interface AlertSubject {
  kind: "decision" | "action" | "meeting";
  id: string;
}

export interface AlertRelated {
  kind: "decision" | "action" | "user";
  id: string;
  label: string;
  /** The meeting a related decision or action belongs to, when the server says. */
  meetingId: string | null;
}

export interface Alert {
  id: string;
  /** The meeting the alert is about. */
  meetingId: string | null;
  alertType: AlertType;
  priority: AlertPriority;
  title: string;
  body: string;
  confidence: number;
  rationale: string | null;
  subject: AlertSubject | null;
  related: AlertRelated[];
  link: string | null;
  createdAt: string | null;
  status: AlertStatus;
  /** The original decision of an `already_decided` alert (ADR-0039 C7); null for other types. */
  decided: AlreadyDecided | null;
  /** The watched topic of a `topic_watch` alert (ADR-0039 C7); null for other types. */
  watch: TopicWatchHit | null;
  /** Arrival order, the last tie-breaker so the list is stable. */
  seq: number;
}

export interface AlertsState {
  byId: Record<string, Alert>;
  dismissed: Record<string, true>;
  nextSeq: number;
}

export const emptyAlertsState: AlertsState = { byId: {}, dismissed: {}, nextSeq: 0 };

/** The live socket payload, as `realtime-gateway` forwards it. */
export interface AlertEventPayload {
  id: string;
  meetingId?: string | null;
  alertType: string;
  priority: number;
  title: string;
  body?: string | null;
  confidence?: number | null;
  rationale?: string | null;
  subject?: unknown;
  related?: unknown;
  link?: string | null;
  createdAt?: string | null;
  /** ADR-0039 C7 fields, when the gateway forwards them (snake_case or camelCase). */
  [extra: string]: unknown;
}

/** A notification-service row, as `/api/meeting-alerts` returns it. */
export interface AlertRow {
  id: string;
  meeting_id?: string | null;
  source?: string | null;
  alert_type?: string | null;
  priority?: number | null;
  title?: string | null;
  body?: string | null;
  link?: string | null;
  /** The alert object of P11 contract section 1 (or `{ alert: {...} }`). */
  payload?: unknown;
  status?: string | null;
  created_at?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES: ReadonlySet<string> = new Set([
  "conflict",
  "workload",
  "dependency",
  "missing_stakeholder",
  "already_decided",
  "topic_watch",
]);
const SUBJECT_KINDS: ReadonlySet<string> = new Set(["decision", "action", "meeting"]);
const RELATED_KINDS: ReadonlySet<string> = new Set(["decision", "action", "user"]);
const MAX_RELATED = 6;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const uuid = (v: unknown) => (typeof v === "string" && UUID.test(v) ? v : null);
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

function subjectOf(raw: unknown): AlertSubject | null {
  const r = obj(raw);
  if (!r || typeof r.kind !== "string" || !SUBJECT_KINDS.has(r.kind)) return null;
  const id = uuid(r.id);
  return id ? { kind: r.kind as AlertSubject["kind"], id } : null;
}

function relatedOf(raw: unknown): AlertRelated[] {
  if (!Array.isArray(raw)) return [];
  const out: AlertRelated[] = [];
  for (const item of raw) {
    const r = obj(item);
    if (!r || typeof r.kind !== "string" || !RELATED_KINDS.has(r.kind)) continue;
    const id = uuid(r.id);
    if (!id) continue;
    out.push({
      kind: r.kind as AlertRelated["kind"],
      id,
      label: str(r.label) ?? "",
      meetingId: uuid(r.meeting_id) ?? uuid(r.meetingId),
    });
    if (out.length >= MAX_RELATED) break;
  }
  return out;
}

const U = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** The only shapes an alert's own link may take: a meeting (optionally one of its decisions), a
 *  decision, or My Tasks. */
const LINK_ALLOWLIST = new RegExp(`^(?:/meetings/${U}(?:/decisions/${U})?|/decisions/${U}|/tasks)$`, "i");

/** An allowlisted app path, or null: anything else (another path, a host, a scheme) renders no
 *  link at all. */
export function safeLink(raw: unknown): string | null {
  return typeof raw === "string" && LINK_ALLOWLIST.test(raw) ? raw : null;
}

type Incoming = Omit<Alert, "seq">;

function normalise(raw: {
  id: unknown;
  meetingId: unknown;
  alertType: unknown;
  priority: unknown;
  title: unknown;
  body: unknown;
  confidence: unknown;
  rationale: unknown;
  subject: unknown;
  related: unknown;
  link: unknown;
  createdAt: unknown;
  status: AlertStatus;
  /** Where the ADR-0039 fields may be: the notification row's alert object (snake_case), or the
   *  live payload (camelCase, `live: true`). */
  extra?: Record<string, unknown> | null;
  live?: boolean;
}): Incoming | null {
  const id = uuid(raw.id);
  const title = str(raw.title);
  const p = raw.priority;
  if (!id || !title || typeof raw.alertType !== "string" || !TYPES.has(raw.alertType)) return null;
  if (p !== 1 && p !== 2 && p !== 3) return null;
  const subject = subjectOf(raw.subject);
  const related = relatedOf(raw.related);
  return {
    id,
    meetingId: uuid(raw.meetingId),
    alertType: raw.alertType as AlertType,
    // ADR-0039 C7 (amended): "already decided" is always attention, amber, never the red banner.
    priority: raw.alertType === "already_decided" ? 2 : p,
    title: title.slice(0, 120),
    body: (str(raw.body) ?? "").slice(0, 400),
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
    rationale: str(raw.rationale),
    subject,
    related,
    link: safeLink(raw.link),
    createdAt: str(raw.createdAt),
    status: raw.status,
    decided:
      raw.alertType === "already_decided" ? decidedOf(raw.extra ?? null, subject, related, str(raw.body), raw.live === true) : null,
    watch: raw.alertType === "topic_watch" ? watchOf(raw.extra ?? null) : null,
  };
}

/** The watched topic of a `topic_watch` alert, from either casing. Null without a topic. */
export function watchOf(src: Record<string, unknown> | null): TopicWatchHit | null {
  const topic = str(src?.topic);
  if (!topic) return null;
  return {
    topic: topic.slice(0, 80),
    snippet: str(src?.snippet)?.slice(0, 200) ?? null,
    meetingTitle: (str(src?.meeting_title) ?? str(src?.meetingTitle))?.slice(0, 200) ?? null,
  };
}

/**
 * The original decision of an `already_decided` alert. Reads the C7 fields from the notification
 * row's alert object in snake_case (`decision_id`, `decision_content`, `decided_at`, `meeting_id`,
 * `meeting_title`, or the same under a nested `decision`), or from the live payload in camelCase
 * (`decisionId`, `decisionContent`, `decidedAt`, `meetingTitle`). The live `meetingId` is the
 * room's meeting, never the decision's, so it is not read. Falls back to the alert's decision
 * subject and its related decision chip. Null when not even the decision's id is known.
 */
export function decidedOf(
  src: Record<string, unknown> | null,
  subject: AlertSubject | null,
  related: AlertRelated[],
  body: string | null,
  live = false,
): AlreadyDecided | null {
  const nested = obj(src?.decision);
  const pick = (snake: string, camel: string, nestedKey: string) =>
    src?.[snake] ?? (live ? src?.[camel] : undefined) ?? nested?.[nestedKey] ?? null;
  const chip = related.find((r) => r.kind === "decision") ?? null;
  const decisionId =
    uuid(pick("decision_id", "decisionId", "id")) ??
    (subject?.kind === "decision" ? subject.id : null) ??
    chip?.id ??
    null;
  if (!decisionId) return null;
  const content = str(pick("decision_content", "decisionContent", "content")) ?? (chip?.label || null) ?? body ?? "";
  return {
    decisionId,
    content: content.slice(0, 500),
    decidedAt: str(pick("decided_at", "decidedAt", "decided_at")),
    // Live: only a snake_case `meeting_id` would be the decision's own; camelCase is the room's.
    meetingId: uuid(src?.meeting_id ?? nested?.meeting_id) ?? chip?.meetingId ?? null,
    meetingTitle: str(pick("meeting_title", "meetingTitle", "meeting_title"))?.slice(0, 200) ?? null,
  };
}

/** Fill in decision fields a live copy lacked, from a fuller copy of the same alert. */
function mergeDecided(current: AlreadyDecided | null, incoming: AlreadyDecided | null): AlreadyDecided | null {
  if (!incoming) return current;
  if (!current) return incoming;
  return {
    decisionId: current.decisionId,
    content: current.content || incoming.content,
    decidedAt: current.decidedAt ?? incoming.decidedAt,
    meetingId: current.meetingId ?? incoming.meetingId,
    meetingTitle: current.meetingTitle ?? incoming.meetingTitle,
  };
}

function upsert(state: AlertsState, incoming: Incoming[]): AlertsState {
  let byId = state.byId;
  let nextSeq = state.nextSeq;
  for (const a of incoming) {
    if (state.dismissed[a.id]) continue;
    const current = byId[a.id];
    if (current) {
      // Live and re-hydrated copies are the same alert. Read only ever moves forward: a stale
      // "unread" never takes a card back from read. A fuller copy fills in the decision an
      // already-decided alert points to.
      const read = a.status === "read" && current.status !== "read";
      const decided = mergeDecided(current.decided, a.decided);
      const watch = current.watch ?? a.watch;
      if (read || decided !== current.decided || watch !== current.watch) {
        if (byId === state.byId) byId = { ...state.byId };
        byId[a.id] = { ...current, status: read ? "read" : current.status, decided, watch };
      }
      continue;
    }
    if (byId === state.byId) byId = { ...state.byId };
    byId[a.id] = { ...a, seq: nextSeq++ };
  }
  return byId === state.byId ? state : { ...state, byId, nextSeq };
}

/**
 * Folds one live "agent-alert" in. With `roomMeetingId`, an alert about any other meeting is
 * ignored: the room's re-hydrate is meeting-scoped, so showing it here would lose it on reload
 * (the gateway already delivers an alert only into its own meeting's room; this holds the line
 * on the client too). It stays in notification-service for the notifications list.
 */
export function applyLiveAlert(state: AlertsState, p: AlertEventPayload, roomMeetingId?: string): AlertsState {
  if (!p || typeof p !== "object") return state;
  if (roomMeetingId !== undefined && p.meetingId !== roomMeetingId) return state;
  const alert = normalise({
    id: p.id,
    meetingId: p.meetingId,
    alertType: p.alertType,
    priority: p.priority,
    title: p.title,
    body: p.body,
    confidence: p.confidence,
    rationale: p.rationale,
    subject: p.subject,
    related: p.related,
    link: p.link,
    createdAt: p.createdAt,
    status: "unread",
    extra: p as Record<string, unknown>,
    live: true,
  });
  return alert ? upsert(state, [alert]) : state;
}

/** Re-hydrate from notification-service. A dismissed row is remembered and never shown. */
export function hydrateAlerts(state: AlertsState, body: { items?: AlertRow[] }): AlertsState {
  const items = Array.isArray(body?.items) ? body.items : [];
  let dismissed = state.dismissed;
  const incoming: Incoming[] = [];
  for (const r of items) {
    if (!r || typeof r !== "object") continue;
    if (r.source && r.source !== "agent_alert") continue;
    const id = uuid(r.id);
    if (!id) continue;
    if (r.status === "dismissed") {
      if (!dismissed[id]) dismissed = { ...dismissed, [id]: true };
      continue;
    }
    const payload = obj(r.payload);
    const alert = obj(payload?.alert) ?? payload ?? {};
    const a = normalise({
      id,
      meetingId: r.meeting_id,
      alertType: r.alert_type ?? alert.alert_type,
      priority: r.priority ?? alert.priority,
      title: r.title ?? alert.title,
      body: r.body ?? alert.body,
      confidence: alert.confidence,
      rationale: alert.rationale,
      subject: alert.subject,
      related: alert.related,
      link: r.link ?? alert.link,
      createdAt: r.created_at,
      status: r.status === "read" ? "read" : "unread",
      extra: alert,
    });
    if (a) incoming.push(a);
  }
  let next = dismissed === state.dismissed ? state : { ...state, dismissed };
  if (dismissed !== state.dismissed) {
    // a row the server says is dismissed leaves even if it was already on screen
    const byId = { ...next.byId };
    for (const id of Object.keys(dismissed)) delete byId[id];
    next = { ...next, byId };
  }
  return upsert(next, incoming);
}

/** Marked read here: it stays, quieter, and stops asking for attention. */
export function markAlertRead(state: AlertsState, id: string): AlertsState {
  const current = state.byId[id];
  if (!current || current.status === "read") return state;
  return { ...state, byId: { ...state.byId, [id]: { ...current, status: "read" } } };
}

/** Dismissed here (or gone on the server): gone for good. */
export function dismissAlert(state: AlertsState, id: string): AlertsState {
  if (state.dismissed[id] && !state.byId[id]) return state;
  const byId = { ...state.byId };
  delete byId[id];
  return { ...state, byId, dismissed: { ...state.dismissed, [id]: true } };
}

function timeOf(a: Alert): number {
  const t = a.createdAt ? Date.parse(a.createdAt) : NaN;
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/** Every visible alert: priority first, then oldest first, then arrival. */
export function orderedAlerts(state: AlertsState): Alert[] {
  return Object.values(state.byId).sort((a, b) => a.priority - b.priority || timeOf(a) - timeOf(b) || a.seq - b.seq);
}

/** The red banner: priority-1 alerts, pinned above every card regardless of arrival. */
export function bannerAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter((a) => a.priority === 1);
}

/** The yellow and blue cards, in the same priority-then-time order. */
export function cardAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter((a) => a.priority !== 1);
}

/** Unread alerts at priority 1 or 2 want the user now (the Needs you count and the rail badge). */
export function alertsNeedingAttention(alerts: Alert[]): number {
  return alerts.filter((a) => a.status === "unread" && a.priority !== 3).length;
}

const seg = (id: string | null | undefined) => (id && UUID.test(id) ? encodeURIComponent(id) : null);

/**
 * Where a related chip points. A decision opens its lineage page, which lives under its meeting
 * (`/meetings/{m}/decisions/{d}`): the alert's own subject decision is in the alert's meeting;
 * another decision links there only when the server says which meeting it belongs to, and to the
 * Decisions list otherwise. An action opens its meeting when known, else My Tasks. A person opens
 * their profile. Ids that are not UUIDs never reach an href.
 */
export function relatedLink(r: AlertRelated, alert: Pick<Alert, "meetingId" | "subject">): { label: string; href: string } {
  const isSubject = alert.subject?.id === r.id;
  const meeting = seg(r.meetingId) ?? (isSubject ? seg(alert.meetingId) : null);
  switch (r.kind) {
    case "decision": {
      const id = seg(r.id);
      return { label: r.label || "Decision", href: meeting && id ? `/meetings/${meeting}/decisions/${id}` : "/decisions" };
    }
    case "action":
      return { label: r.label || "Action", href: meeting ? `/meetings/${meeting}` : "/tasks" };
    case "user": {
      const id = seg(r.id);
      return { label: r.label || "Teammate", href: id ? `/people/${id}` : "/people" };
    }
  }
}

/**
 * The alert's own "Open" link, only ever an allowlisted path (`safeLink`). The contract's
 * `/decisions/{id}` has no page in this app (lineage lives under the meeting), so it is mapped to
 * the lineage page when the id is the subject decision, and to the Decisions list otherwise.
 * `/meetings/{id}`, `/meetings/{id}/decisions/{id}` and `/tasks` pass through.
 */
export function alertHref(alert: Pick<Alert, "link" | "meetingId" | "subject">): string | null {
  const link = safeLink(alert.link);
  if (!link) return null;
  const m = /^\/decisions\/([0-9a-f-]{36})\/?$/i.exec(link);
  if (!m) return link;
  const meeting = seg(alert.meetingId);
  return meeting && alert.subject?.kind === "decision" && alert.subject.id === m[1]
    ? `/meetings/${meeting}/decisions/${encodeURIComponent(m[1])}`
    : "/decisions";
}

export const ALERT_LABEL: Record<AlertType, string> = {
  conflict: "Possible conflict",
  workload: "Workload warning",
  dependency: "Blocked dependency",
  missing_stakeholder: "Missing stakeholder",
  already_decided: "Already decided",
  topic_watch: "Topic you watch",
};

/** Where the original decision of an `already_decided` alert opens: its lineage page under its
 *  meeting when both ids are known, else the Decisions list. */
export function decidedHref(d: Pick<AlreadyDecided, "decisionId" | "meetingId">): string {
  const m = seg(d.meetingId);
  const id = seg(d.decisionId);
  return m && id ? `/meetings/${m}/decisions/${id}` : "/decisions";
}
