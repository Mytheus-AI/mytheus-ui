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
 */

export type AlertType = "conflict" | "workload" | "dependency" | "missing_stakeholder";
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
const TYPES: ReadonlySet<string> = new Set(["conflict", "workload", "dependency", "missing_stakeholder"]);
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

/** Only a same-origin relative path survives; anything else could leave the app. */
function safeLink(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || /[\\\s<>"]/.test(raw)) return null;
  return raw;
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
}): Incoming | null {
  const id = uuid(raw.id);
  const title = str(raw.title);
  const p = raw.priority;
  if (!id || !title || typeof raw.alertType !== "string" || !TYPES.has(raw.alertType)) return null;
  if (p !== 1 && p !== 2 && p !== 3) return null;
  return {
    id,
    meetingId: uuid(raw.meetingId),
    alertType: raw.alertType as AlertType,
    priority: p,
    title: title.slice(0, 120),
    body: (str(raw.body) ?? "").slice(0, 400),
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
    rationale: str(raw.rationale),
    subject: subjectOf(raw.subject),
    related: relatedOf(raw.related),
    link: safeLink(raw.link),
    createdAt: str(raw.createdAt),
    status: raw.status,
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
      // "unread" never takes a card back from read.
      if (a.status === "read" && current.status !== "read") {
        if (byId === state.byId) byId = { ...state.byId };
        byId[a.id] = { ...current, status: "read" };
      }
      continue;
    }
    if (byId === state.byId) byId = { ...state.byId };
    byId[a.id] = { ...a, seq: nextSeq++ };
  }
  return byId === state.byId ? state : { ...state, byId, nextSeq };
}

export function applyLiveAlert(state: AlertsState, p: AlertEventPayload): AlertsState {
  if (!p || typeof p !== "object") return state;
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
 * The alert's own "Open" link. The contract's `/decisions/{id}` has no page in this app (lineage
 * lives under the meeting), so it is mapped to the lineage page when the id is the subject
 * decision, and to the Decisions list otherwise. Other relative paths pass through.
 */
export function alertHref(alert: Pick<Alert, "link" | "meetingId" | "subject">): string | null {
  const link = alert.link;
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
};
