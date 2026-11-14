/**
 * The stream route's pure parts (`app/api/ask-myte/route.ts`): checking what the browser sent,
 * shaping the request rag-service expects (ADR-0047 D8), and turning a failed upstream response
 * into the stream's own `error` event, so the page has one way to show every failure.
 *
 * Pure, tested in tests/ask-myte-upstream.test.ts.
 */

import { cleanPage, cleanScope } from "./page-context.ts";
import type { AskPage, AskScope, ErrorEvent, HistoryItem, Persona } from "./types.ts";
import { LIMITS } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ZONE = /^[A-Za-z0-9_+\-/]{1,64}$/;

export interface CheckedAsk {
  threadId: string | null;
  question: string;
  scope: Omit<AskScope, "label">;
  /** the scope's label, kept only to store with the question */
  scopeLabel: string | null;
  page: AskPage | null;
  history: HistoryItem[];
  timezone: string | null;
}

export function checkAskBody(raw: unknown): { ok: true; value: CheckedAsk } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object") return { ok: false, message: "Send a question." };
  const body = raw as Record<string, unknown>;
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return { ok: false, message: "Type a question first." };
  if (question.length > LIMITS.question) return { ok: false, message: `Keep the question under ${LIMITS.question} characters.` };
  const threadId = typeof body.thread_id === "string" && UUID.test(body.thread_id) ? body.thread_id : null;
  const rawScope = (body.scope && typeof body.scope === "object" ? body.scope : null) as AskScope | null;
  const history: HistoryItem[] = Array.isArray(body.history)
    ? body.history
        .filter((h): h is HistoryItem => !!h && typeof h === "object" && (h.role === "user" || h.role === "myte") && typeof h.content === "string" && h.content.trim() !== "")
        .map((h) => ({ role: h.role, content: h.content.slice(0, LIMITS.historyItem) }))
        .slice(-LIMITS.history)
    : [];
  const tz = typeof body.timezone === "string" && ZONE.test(body.timezone) ? body.timezone : null;
  return {
    ok: true,
    value: {
      threadId,
      question,
      scope: cleanScope(rawScope),
      scopeLabel: typeof rawScope?.label === "string" ? rawScope.label.slice(0, 200) : null,
      page: cleanPage((body.page ?? null) as AskPage | null),
      history,
      timezone: tz,
    },
  };
}

/** The body of `POST /api/rag/myte`. */
export function upstreamBody(ask: CheckedAsk, persona: Persona, history: HistoryItem[]) {
  return {
    question: ask.question,
    history: history.slice(-LIMITS.history),
    scope: ask.scope,
    persona,
    page: ask.page ?? { kind: null, id: null, title: null },
    want_title: ask.threadId === null,
    ...(ask.timezone ? { timezone: ask.timezone } : {}),
  };
}

/**
 * A non-stream answer from the gateway or rag-service, as a D8 `error`. rag-service answers a
 * bad token with a plain 401; the gateway may answer 402/429 for a spent budget, 503 with
 * reason `ask_not_connected`/`not_connected` before Ask is wired on a workspace, or 404/405 when
 * the route is not deployed yet (also "not connected").
 */
export function upstreamError(status: number, problem: { reason?: unknown; code?: unknown; detail?: unknown } | null): ErrorEvent {
  const reason = typeof problem?.reason === "string" ? problem.reason : "";
  const code = typeof problem?.code === "string" ? problem.code : "";
  const detail = typeof problem?.detail === "string" ? problem.detail.slice(0, 300) : "";
  if (status === 401 || code === "AUTH_REQUIRED" || code === "TOKEN_EXPIRED") return { reason: "session", message: "" };
  if (status === 402 || status === 429 || code === "QUOTA_EXCEEDED" || code === "RATE_LIMITED" || reason.includes("budget")) return { reason: "budget", message: detail };
  if (reason.includes("not_connected") || status === 404 || status === 405) return { reason: "not_connected", message: "" };
  if (status === 400 || status === 422) return { reason: "invalid", message: detail };
  return { reason: "unavailable", message: "" };
}
