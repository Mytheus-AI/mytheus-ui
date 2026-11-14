/**
 * `POST /api/ask-myte`: the Ask Myte stream (mytheus-docs ADR-0047 D8), for the browser.
 *
 * Why a route handler: the answer streams (server-sent events), and `lib/api/client.ts` is
 * server-only and JSON-only by construction. This handler holds no secret; it forwards the
 * caller's own Clerk session and nothing else that identifies them.
 *
 * What it does, in order:
 * 1. Checks the session and the body (question 1..2000, a clean scope and page; anything else
 *    in the body, an `org_id` for instance, is dropped).
 * 2. Mints a fresh session token for this session through Clerk's Backend API (the token lives
 *    60 s and an answer can take 45 s of tool time, so the one in the request's cookie could
 *    expire mid-answer). On the server this is the equivalent of the browser's
 *    `getToken({ skipCache: true })`, which server-side Clerk does not offer; if the mint fails it
 *    falls back to the request's own token.
 * 3. Reads the thread's last 12 messages from core-api when `thread_id` is given, and the
 *    caller's Myte persona from their profile (it shapes tone only, never permissions).
 * 4. Posts to rag-service's `POST /api/rag/myte` through the gateway and relays every event to
 *    the browser as it arrives, while running the same reducer the page uses to build the answer.
 * 5. On `done`: creates the thread if it is new (titled from the `title` event, else the
 *    question), appends the question and the answer with one Idempotency-Key and ANOTHER fresh
 *    token, then sends its own `saved` event `{thread_id, message_ids}`. If storing fails it
 *    sends `unsaved` and the answer still stands on screen.
 * 6. When the browser goes away (Stop, Esc, a closed tab) the upstream request is aborted, so no
 *    model round runs for nobody. Nothing is stored for a stopped answer.
 *
 * Every failure reaches the browser as a D8 `error` event in the stream, never as a bare status,
 * except a request with no session (401 JSON, before any stream starts).
 *
 * ADR-0049 additions: up to 30 of the caller's memories (`GET /api/v1/myte/memories`) go with
 * every ask; `attachments` pass through after the same limits the composer applies (3 files,
 * 40,000 characters), and only their names are stored; `mode: "peer_answer"` runs only when
 * core-api says the question (`GET /api/v1/myte/peer-questions/{id}`) is addressed to the caller
 * and still pending, takes the question's words from core-api, and is never stored as a thread;
 * `thread_title` names a routine run's new thread.
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { gatewayUrl } from "@/lib/api/client";
import { fetchMyProfile } from "@/lib/api/profile";
import { agentDisplayName } from "@/lib/api/profile-types";
import { asPersonality } from "@/lib/realtime/agent-persona";
import { createSseParser, encodeSse } from "@/lib/ask-myte/sse";
import { fallbackTitle, historyFrom, newAnswer, reduceAnswer, titleFrom, toPayload, type Answer } from "@/lib/ask-myte/reducer";
import { checkAskBody, memoriesFor, upstreamBody, upstreamError, type CheckedAsk } from "@/lib/ask-myte/upstream";
import type { ErrorEvent, HistoryItem, MemoryRef, PeerQuestion, Persona, StoredMessage, StreamEvent, Thread } from "@/lib/ask-myte/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** rag-service gives up at 8 rounds and 45 s of tool time; this is the outer bound for the whole answer. */
const ANSWER_TIMEOUT_MS = 120_000;
const READ_TIMEOUT_MS = 6000;

type TokenFn = () => Promise<string | null>;

async function gatewayJson<T>(token: string | null, path: string, init: { method?: string; body?: unknown; key?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.key) headers["Idempotency-Key"] = init.key;
  const res = await fetch(`${gatewayUrl()}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: init.method && init.method !== "GET" ? AbortSignal.timeout(15_000) : AbortSignal.timeout(READ_TIMEOUT_MS),
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return (res.status === 204 ? undefined : await res.json()) as T;
}

async function loadHistory(token: string | null, ask: CheckedAsk): Promise<{ threadId: string | null; history: HistoryItem[] }> {
  if (!ask.threadId) return { threadId: null, history: ask.history };
  try {
    const thread = await gatewayJson<Thread>(token, `/api/v1/myte/threads/${ask.threadId}`);
    const messages: StoredMessage[] = Array.isArray(thread?.messages) ? thread.messages : [];
    return { threadId: ask.threadId, history: historyFrom(messages) };
  } catch (err) {
    // A thread that is gone (deleted in another tab) starts a new one rather than failing.
    if ((err as { status?: number }).status === 404) return { threadId: null, history: [] };
    throw err;
  }
}

async function loadPersona(): Promise<{ persona: Persona; userId: string | null }> {
  const profile = await fetchMyProfile().catch(() => null);
  return {
    persona: {
      name: agentDisplayName(profile?.agent_name ?? null, profile?.display_name ?? ""),
      personality: asPersonality(profile?.agent_personality),
      instructions: profile?.agent_instructions?.trim() ? profile.agent_instructions.trim().slice(0, 1000) : null,
    },
    userId: profile?.id ?? null,
  };
}

/** ADR-0049 F4: up to 30 of the person's memories go with every ask. A failed read sends none. */
async function loadMemories(token: string | null): Promise<MemoryRef[]> {
  try {
    return memoriesFor(await gatewayJson<unknown>(token, "/api/v1/myte/memories"));
  } catch {
    return [];
  }
}

/** ADR-0049 F1: a peer draft runs only for the question's recipient, while it is still waiting.
    The question's words come from core-api, never from the browser. */
async function checkPeer(token: string | null, ask: CheckedAsk, userId: string | null): Promise<{ ok: true; ask: CheckedAsk } | { ok: false; message: string }> {
  if (ask.mode !== "peer_answer" || !ask.peer) return { ok: true, ask };
  let q: PeerQuestion;
  try {
    q = await gatewayJson<PeerQuestion>(token, `/api/v1/myte/peer-questions/${ask.peer.question_id}`);
  } catch {
    return { ok: false, message: "That question is no longer there." };
  }
  if (!userId || q.to_user?.id !== userId) return { ok: false, message: "Only the person it was sent to can draft an answer." };
  if (q.status !== "pending") return { ok: false, message: "That question was already answered or declined." };
  const peer = { question_id: q.id, from_name: q.from_user?.name ?? ask.peer.from_name, question: q.question };
  // The typed instruction stays; with none, the question itself is asked.
  const question = ask.question === ask.peer.question ? q.question : ask.question;
  return { ok: true, ask: { ...ask, peer, question, threadId: null } };
}

async function persist(
  freshToken: TokenFn,
  ask: CheckedAsk,
  threadId: string | null,
  answer: Answer,
  events: StreamEvent[],
  key: string,
): Promise<{ thread_id: string; message_ids: string[] }> {
  const token = await freshToken();
  let id = threadId;
  if (!id) {
    const created = await gatewayJson<{ id: string }>(token, "/api/v1/myte/threads", {
      method: "POST",
      key: `${key}-thread`,
      body: { title: ask.threadTitle ?? titleFrom(events) ?? fallbackTitle(ask.question), scope: ask.scope },
    });
    id = created.id;
  }
  const body = {
    messages: [
      {
        role: "user",
        content: ask.question,
        // Attachments are not stored beyond their names (ADR-0049 F7).
        payload: { scope: { ...ask.scope, label: ask.scopeLabel }, page: ask.page, ...(ask.attachments.length ? { attachments: ask.attachments.map((a) => a.name) } : {}) },
      },
      { role: "myte", content: answer.text, payload: toPayload(answer) },
    ],
  };
  // One retry on a network failure, with the same key, so a blip never stores the exchange twice.
  let saved: { items: { id: string }[] } | null = null;
  for (let attempt = 0; attempt < 2 && !saved; attempt++) {
    try {
      saved = await gatewayJson<{ items: { id: string }[] }>(attempt === 0 ? token : await freshToken(), `/api/v1/myte/threads/${id}/messages`, {
        method: "POST",
        key: `${key}-messages`,
        body,
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (attempt === 1 || (status !== undefined && status < 500)) throw err;
    }
  }
  return { thread_id: id, message_ids: (saved?.items ?? []).map((m) => m.id).filter((x) => typeof x === "string") };
}

export async function POST(request: Request): Promise<Response> {
  const { userId, sessionId, getToken } = await auth();
  if (!userId) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = null;
  }
  const checked = checkAskBody(raw);
  const freshToken: TokenFn = async () => {
    if (sessionId) {
      try {
        const minted = await (await clerkClient()).sessions.getToken(sessionId);
        if (minted?.jwt) return minted.jwt;
      } catch {
        // Backend API unreachable: the request's own token is still good for a while.
      }
    }
    return getToken();
  };
  const encoder = new TextEncoder();
  const upstreamAbort = new AbortController();
  const onClientGone = () => upstreamAbort.abort();
  request.signal.addEventListener("abort", onClientGone);
  const timeout = setTimeout(() => upstreamAbort.abort(), ANSWER_TIMEOUT_MS);
  const key = crypto.randomUUID();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (ev: StreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encodeSse(ev)));
        } catch {
          open = false;
        }
      };
      const fail = (err: ErrorEvent) => send({ event: "error", data: err });
      const close = () => {
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", onClientGone);
        if (open) {
          open = false;
          try {
            controller.close();
          } catch {
            // already closed by the runtime
          }
        }
      };

      if (!checked.ok) {
        fail({ reason: "invalid", message: checked.message });
        close();
        return;
      }
      const ask = checked.value;

      try {
        const token = await freshToken();
        if (!token) {
          fail({ reason: "session", message: "" });
          return close();
        }
        const [{ threadId, history }, { persona, userId }, memories] = await Promise.all([loadHistory(token, ask), loadPersona(), loadMemories(token)]);
        const peerCheck = await checkPeer(token, { ...ask, threadId }, userId);
        if (!peerCheck.ok) {
          fail({ reason: "invalid", message: peerCheck.message });
          return close();
        }
        const effective: CheckedAsk = peerCheck.ask;

        const upstream = await fetch(`${gatewayUrl()}/api/rag/myte`, {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(upstreamBody(effective, persona, effective.mode === "peer_answer" ? ask.history : history, memories)),
          cache: "no-store",
          signal: upstreamAbort.signal,
        });

        const type = upstream.headers.get("content-type") ?? "";
        if (!upstream.ok || !type.includes("text/event-stream") || !upstream.body) {
          let problem: { reason?: unknown; code?: unknown; detail?: unknown } | null = null;
          try {
            problem = (await upstream.json()) as typeof problem;
          } catch {
            problem = null;
          }
          fail(upstreamError(upstream.ok ? 502 : upstream.status, problem));
          return close();
        }

        const parser = createSseParser();
        const decoder = new TextDecoder();
        const reader = upstream.body.getReader();
        const events: StreamEvent[] = [];
        let answer = newAnswer(key, Date.now());
        let settled = false;

        const take = (evs: StreamEvent[]) => {
          for (const ev of evs) {
            if (settled) continue;
            // `saved`/`unsaved` are this route's own; an upstream that sent them is ignored.
            if (ev.event === "saved" || ev.event === "unsaved") continue;
            events.push(ev);
            answer = reduceAnswer(answer, ev, Date.now());
            send(ev);
            if (ev.event === "done" || ev.event === "error") settled = true;
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          take(parser.feed(decoder.decode(value, { stream: true })));
          if (settled) break;
        }
        take(parser.feed(decoder.decode()));
        take(parser.end());
        reader.cancel().catch(() => {});

        if (!settled) {
          // The stream ended without `done` or `error`: rag-service went away mid-answer.
          fail({ reason: "unavailable", message: "" });
          return close();
        }
        if (answer.status !== "done") return close();
        // A peer draft is the recipient's to edit and send; it is never stored as a thread.
        if (effective.mode === "peer_answer") return close();

        try {
          const saved = await persist(freshToken, effective, threadId, answer, events, key);
          send({ event: "saved", data: saved });
        } catch {
          send({ event: "unsaved", data: { message: "This answer couldn't be saved to your history." } });
        }
        close();
      } catch (err) {
        if (upstreamAbort.signal.aborted && request.signal.aborted) {
          // The person stopped the answer: nobody is listening, and nothing is stored.
          return close();
        }
        if (upstreamAbort.signal.aborted) fail({ reason: "unavailable", message: "" });
        else if ((err as { status?: number }).status === 401) fail({ reason: "session", message: "" });
        else fail({ reason: "unavailable", message: "" });
        close();
      }
    },
    cancel() {
      upstreamAbort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Reverse proxies (nginx, Caddy with buffering) must pass each event through at once.
      "X-Accel-Buffering": "no",
    },
  });
}
