/**
 * The stream route's pure parts (`app/api/ask-myte/route.ts`): checking what the browser sent,
 * shaping the request rag-service expects (ADR-0047 D8), and turning a failed upstream response
 * into the stream's own `error` event, so the page has one way to show every failure.
 *
 * Pure, tested in tests/ask-myte-upstream.test.ts.
 */

import { cleanPage, cleanScope } from "./page-context.ts";
import { checkAttachments } from "./attachments.ts";
import type { AskMode, AskPage, AskScope, Attachment, ErrorEvent, HistoryItem, MemoryRef, PeerContext, Persona } from "./types.ts";
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
  /** ADR-0049 F7 */
  attachments: Attachment[];
  /** ADR-0049 F1: a peer draft is streamed back and never stored */
  mode: AskMode;
  channel: "text" | "voice";
  peer: PeerContext | null;
  /** ADR-0049 F5: the new thread's title for a routine run */
  threadTitle: string | null;
}

export function checkAskBody(raw: unknown): { ok: true; value: CheckedAsk } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object") return { ok: false, message: "Send a question." };
  const body = raw as Record<string, unknown>;
  const mode: AskMode = body.mode === "peer_answer" ? "peer_answer" : "ask";
  const channel = body.channel === "voice" && mode === "ask" ? "voice" : "text";
  let peer: PeerContext | null = null;
  if (mode === "peer_answer") {
    const p = (body.peer && typeof body.peer === "object" ? body.peer : null) as Record<string, unknown> | null;
    const qid = typeof p?.question_id === "string" && UUID.test(p.question_id) ? p.question_id : null;
    const pq = typeof p?.question === "string" ? p.question.trim().slice(0, LIMITS.peerQuestion) : "";
    if (!qid || !pq) return { ok: false, message: "That question for your Myte couldn't be read." };
    peer = { question_id: qid, from_name: typeof p?.from_name === "string" ? p.from_name.trim().slice(0, 120) : "", question: pq };
  }
  // In peer_answer the teammate's question is the question; anything typed is an instruction.
  const question = (typeof body.question === "string" ? body.question.trim() : "") || (peer?.question ?? "");
  if (!question) return { ok: false, message: "Type a question first." };
  const files = checkAttachments(body.attachments);
  if (!files.ok) return { ok: false, message: files.message };
  const threadTitle = typeof body.thread_title === "string" && body.thread_title.trim() ? body.thread_title.replace(/\s+/g, " ").trim().slice(0, LIMITS.title) : null;
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
      attachments: files.value,
      mode,
      channel,
      peer,
      // A peer draft never creates a thread, so it has no title or thread of its own.
      threadTitle: mode === "peer_answer" ? null : threadTitle,
      ...(mode === "peer_answer" ? { threadId: null } : {}),
    },
  };
}

/** Up to 30 of the person's memories, as the stream sends them (ADR-0049 F4). */
export function memoriesFor(raw: unknown): MemoryRef[] {
  const items = raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items) ? (raw as { items: unknown[] }).items : [];
  const out: MemoryRef[] = [];
  for (const m of items) {
    if (!m || typeof m !== "object") continue;
    const { id, text } = m as Record<string, unknown>;
    if (typeof id === "string" && typeof text === "string" && text.trim()) out.push({ id, text: text.trim().slice(0, LIMITS.memoryText) });
    if (out.length >= LIMITS.memories) break;
  }
  return out;
}

/** The body of `POST /api/rag/myte`. */
export function upstreamBody(ask: CheckedAsk, persona: Persona, history: HistoryItem[], memories: MemoryRef[] = []) {
  return {
    question: ask.question,
    history: history.slice(-LIMITS.history),
    // The chip's words go along so Myte knows who "he" or "this meeting" is (it only had ids).
    scope: ask.scope.kind === "all" ? ask.scope : { ...ask.scope, label: ask.scopeLabel },
    persona,
    page: ask.page ?? { kind: null, id: null, title: null },
    // A routine's thread is titled after the routine; a peer draft has no thread at all.
    want_title: ask.threadId === null && ask.mode === "ask" && !ask.threadTitle,
    ...(ask.timezone ? { timezone: ask.timezone } : {}),
    memories: memories.slice(0, LIMITS.memories),
    ...(ask.attachments.length ? { attachments: ask.attachments } : {}),
    mode: ask.mode,
    ...(ask.channel === "voice" ? { channel: "voice" } : {}),
    ...(ask.peer ? { peer: ask.peer } : {}),
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
