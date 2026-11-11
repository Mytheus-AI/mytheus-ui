/**
 * The extension's decision-check requests ("Decisions that follow you"), validated before they
 * reach the gateway. Pure (no Next or Clerk imports), so `tests/capture-decisions.test.ts` imports
 * this file directly.
 *
 * The extension sends only the paragraph being written. Here it becomes the public API's body:
 * `POST /api/v1/decisions/check` (source `extension`), `POST /api/v1/decisions/{id}/check-dismissals`
 * and `POST /api/v1/decisions/{id}/reopen-requests`. Nothing is stored by the dashboard.
 */

export const CHECK_MAX_CHARS = 4000;
export const QUOTE_MAX_CHARS = 500;
export const PLACE_MAX_CHARS = 120;
export const LINK_MAX_CHARS = 2000;
export const DEFAULT_RETRY_AFTER_S = 30;

export type WritingSite = "docs" | "gmail" | "jira";

export const SITE_PLACE: Record<WritingSite, string> = { docs: "Google Docs", gmail: "Gmail", jira: "Jira" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Parsed<T> = { ok: true; value: T } | { ok: false; code: "VALIDATION_FAILED" };

const bad = { ok: false, code: "VALIDATION_FAILED" } as const;

function clean(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim();
  return text && text.length <= max ? text : null;
}

function optional(raw: unknown, max: number): string | null | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return clean(raw, max);
}

export function isWritingSite(v: unknown): v is WritingSite {
  return v === "docs" || v === "gmail" || v === "jira";
}

export interface CheckBody {
  text: string;
  source: "extension";
  context: { place_label: string };
}

export function parseCheckBody(body: Record<string, unknown> | null): Parsed<CheckBody> {
  if (!body || !isWritingSite(body.site)) return bad;
  const text = clean(body.text, CHECK_MAX_CHARS);
  if (!text) return bad;
  const place = optional(body.place_label, PLACE_MAX_CHARS);
  if (place === null) return bad;
  return { ok: true, value: { text, source: "extension", context: { place_label: place ?? SITE_PLACE[body.site] } } };
}

export interface DismissBody {
  decisionId: string;
  body: { quote: string; source: "extension" };
}

export function parseDismissBody(body: Record<string, unknown> | null): Parsed<DismissBody> {
  if (!body || typeof body.decision_id !== "string" || !UUID_RE.test(body.decision_id)) return bad;
  const quote = clean(body.quote, QUOTE_MAX_CHARS);
  if (!quote) return bad;
  return { ok: true, value: { decisionId: body.decision_id.toLowerCase(), body: { quote, source: "extension" } } };
}

/** Only an https (or localhost http) address is passed on as the place a decision was challenged. */
export function safePlaceLink(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string" || raw.length > LINK_MAX_CHARS) return null;
  try {
    const u = new URL(raw);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol !== "https:" && !(local && u.protocol === "http:")) return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export interface ReopenBody {
  decisionId: string;
  body: { quote: string; source: "extension"; place_label?: string; link?: string; reason?: string };
}

export function parseReopenBody(body: Record<string, unknown> | null): Parsed<ReopenBody> {
  if (!body || typeof body.decision_id !== "string" || !UUID_RE.test(body.decision_id)) return bad;
  const quote = clean(body.quote, QUOTE_MAX_CHARS);
  if (!quote) return bad;
  const place = optional(body.place_label, PLACE_MAX_CHARS);
  const reason = optional(body.reason, 1000);
  const link = safePlaceLink(body.link);
  if (place === null || reason === null || link === null) return bad;
  const out: ReopenBody["body"] = { quote, source: "extension" };
  if (place) out.place_label = place;
  if (reason) out.reason = reason;
  if (link) out.link = link;
  return { ok: true, value: { decisionId: body.decision_id.toLowerCase(), body: out } };
}

/**
 * How a gateway failure is told to the extension: 401 reconnect, 429 with `retry_after`, 503
 * `CHECK_NOT_CONNECTED` when decision checks are not wired on the server, 404 and 409 as they are.
 */
export function decisionsProblem(
  status: number,
  code: string,
  reason: string | null,
  retryAfter: number | null,
): { status: number; body: Record<string, unknown>; retryAfter?: number } {
  if (status === 401) return { status: 401, body: { code: "LINK_EXPIRED" } };
  if (status === 429) {
    const wait = retryAfter && retryAfter > 0 ? Math.ceil(retryAfter) : DEFAULT_RETRY_AFTER_S;
    return { status: 429, body: { code: "RATE_LIMITED", retry_after: wait }, retryAfter: wait };
  }
  if (status === 503) {
    return { status: 503, body: { code: reason === "check_not_connected" ? "CHECK_NOT_CONNECTED" : "DEPENDENCY_UNAVAILABLE" } };
  }
  if (status === 403 || status === 404 || status === 409 || status === 422) {
    return { status, body: { code: status === 409 ? "NOT_CONFIRMED" : code } };
  }
  return { status: 502, body: { code } };
}
