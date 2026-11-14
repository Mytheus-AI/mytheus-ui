"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSseParser } from "@/lib/ask-myte/sse";
import {
  failAnswer,
  fromStored,
  historyFrom,
  newAnswer,
  reduceAnswer,
  setProposalStatus,
  stopAnswer,
  type Answer,
  type Message,
  type ProposalStatus,
  type Question,
} from "@/lib/ask-myte/reducer";
import type { AskPage, AskScope, ProposalEvent, StreamEvent, Thread } from "@/lib/ask-myte/types";
import { browserTimeZone } from "@/lib/timezone";

/* One Ask Myte conversation in the browser: posts a question to `/api/ask-myte`, reads the
   server-sent events as they arrive and folds them into the message list with the shared reducer
   (lib/ask-myte/reducer.ts). The page and the ⌘J sheet both run on it, against the same threads.

   - Stop aborts the request (the route then aborts rag-service) and keeps what streamed.
   - Offline: a question asked offline fails at once as "offline"; going offline mid-answer stops
     it the same way, keeping the text.
   - A proposal's confirmed or dismissed state is kept per stored message in this browser
     (localStorage), because the ADR has no route to edit a stored payload. The write itself is
     the truth; this only stops a confirmed card from offering Confirm again after a reload. */

const ENDPOINT = "/api/ask-myte";
const MARKS_KEY = "mx-ask-proposals";
const MARKS_MAX = 400;

type Marks = Record<string, { status: ProposalStatus; title?: string; due_date?: string | null }>;

function readMarks(): Marks {
  try {
    const raw = localStorage.getItem(MARKS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Marks) : {};
  } catch {
    return {};
  }
}

function writeMark(key: string, mark: Marks[string]) {
  try {
    const all = readMarks();
    all[key] = mark;
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - MARKS_MAX))) delete all[k];
    localStorage.setItem(MARKS_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked: the card shows its state for this visit only.
  }
}

/** Stored messages with this browser's confirmed/dismissed marks applied. */
function hydrate(thread: Thread | null): Message[] {
  if (!thread) return [];
  const marks = typeof window === "undefined" ? {} : readMarks();
  return thread.messages.map((m) => {
    const msg = fromStored(m);
    if (msg.role !== "myte" || !msg.id) return msg;
    let out = msg;
    for (const p of msg.proposals) {
      const mark = marks[`${msg.id}:${p.id}`];
      if (mark && p.status === "open") out = setProposalStatus(out, p.id, mark.status, { title: mark.title ?? p.title, due_date: mark.due_date ?? p.due_date });
    }
    return out;
  });
}

let seq = 0;
const nextKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export interface AskMyteState {
  threadId: string | null;
  title: string | null;
  messages: Message[];
  streaming: boolean;
  /** ticks once a second while streaming, for the "Still looking" line */
  now: number;
  send: (question: string, scope: AskScope, page: AskPage | null) => void;
  stop: () => void;
  retry: (answerKey: string) => void;
  /** start a new conversation */
  reset: () => void;
  /** show a stored thread */
  load: (thread: Thread | null) => void;
  markProposal: (answerKey: string, proposalId: string, status: ProposalStatus, edits?: Partial<ProposalEvent>) => void;
  setFeedback: (answerKey: string, feedback: -1 | 0 | 1, reason: string | null) => void;
  lastQuestion: string | null;
}

export function useAskMyte({
  initialThread = null,
  onSaved,
}: {
  initialThread?: Thread | null;
  /** a new thread was stored, or an answer appended (thread id, the title the stream gave) */
  onSaved?: (threadId: string, title: string | null) => void;
} = {}): AskMyteState {
  const [threadId, setThreadId] = useState<string | null>(initialThread?.id ?? null);
  const [title, setTitle] = useState<string | null>(initialThread?.title ?? null);
  const [messages, setMessages] = useState<Message[]>(() => hydrate(initialThread));
  const [streaming, setStreaming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const abort = useRef<AbortController | null>(null);
  const live = useRef<string | null>(null);
  const threadRef = useRef(threadId);
  threadRef.current = threadId;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // Apply this browser's proposal marks after mount (the server render cannot read them).
  useEffect(() => {
    if (initialThread) setMessages(hydrate(initialThread));
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!streaming) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [streaming]);

  const patch = useCallback((key: string, fn: (a: Answer) => Answer) => {
    setMessages((list) => list.map((m) => (m.role === "myte" && m.key === key ? fn(m) : m)));
  }, []);

  const finish = useCallback(() => {
    abort.current = null;
    live.current = null;
    setStreaming(false);
  }, []);

  // Going offline mid-answer ends it as "offline", keeping what streamed.
  useEffect(() => {
    const off = () => {
      const key = live.current;
      if (!key) return;
      abort.current?.abort();
      patch(key, (a) => failAnswer(a, "offline"));
      finish();
    };
    window.addEventListener("offline", off);
    return () => window.removeEventListener("offline", off);
  }, [patch, finish]);

  // A route change or unmount stops a running answer.
  useEffect(() => () => abort.current?.abort(), []);

  const run = useCallback(
    async (question: string, scope: AskScope, page: AskPage | null, base: Message[]) => {
      const q: Question = { key: nextKey("q"), role: "user", id: null, text: question, scope: scope.kind === "all" ? null : scope };
      const answer = newAnswer(nextKey("a"), Date.now());
      setMessages([...base, q, answer]);
      setStreaming(true);
      live.current = answer.key;

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        patch(answer.key, (a) => failAnswer(a, "offline"));
        finish();
        return;
      }

      const controller = new AbortController();
      abort.current = controller;
      let streamTitle: string | null = null;
      const apply = (ev: StreamEvent) => {
        if (ev.event === "title") streamTitle = ev.data.text;
        if (ev.event === "saved") {
          setThreadId(ev.data.thread_id);
          if (streamTitle) setTitle(streamTitle);
          onSavedRef.current?.(ev.data.thread_id, streamTitle);
        }
        patch(answer.key, (a) => reduceAnswer(a, ev, Date.now()));
      };

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({
            thread_id: threadRef.current,
            question,
            scope,
            page,
            history: threadRef.current ? undefined : historyFrom(base),
            timezone: browserTimeZone(),
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body || !(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
          // The route exists, so a 404 here is the middleware's `auth.protect()` refusing a signed-out
          // fetch: the same as the route's own 401.
          patch(answer.key, (a) => failAnswer(a, res.status === 401 || res.status === 404 ? "session" : "unavailable"));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parser = createSseParser();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const ev of parser.feed(decoder.decode(value, { stream: true }))) apply(ev);
        }
        for (const ev of parser.end()) apply(ev);
        // A stream that closed without settling broke on the way.
        patch(answer.key, (a) => failAnswer(a, "unavailable"));
      } catch {
        if (controller.signal.aborted) return;
        patch(answer.key, (a) => failAnswer(a, typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "unavailable"));
      } finally {
        if (abort.current === controller || abort.current === null) finish();
      }
    },
    [patch, finish],
  );

  const send = useCallback(
    (question: string, scope: AskScope, page: AskPage | null) => {
      const text = question.trim();
      if (!text || live.current) return;
      void run(text, scope, page, messagesRef.current);
    },
    [run],
  );

  const stop = useCallback(() => {
    const key = live.current;
    if (!key) return;
    abort.current?.abort();
    patch(key, stopAnswer);
    finish();
  }, [patch, finish]);

  const retry = useCallback(
    (answerKey: string) => {
      if (live.current) return;
      const list = messagesRef.current;
      const at = list.findIndex((m) => m.key === answerKey);
      const q = at > 0 ? list[at - 1] : null;
      if (!q || q.role !== "user") return;
      const scope: AskScope = q.scope ?? { kind: "all", meeting_id: null, person_id: null, as_of: null };
      void run(q.text, scope, null, [...list.slice(0, at - 1), ...list.slice(at + 1)]);
    },
    [run],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    finish();
    setThreadId(null);
    setTitle(null);
    setMessages([]);
  }, [finish]);

  const load = useCallback(
    (thread: Thread | null) => {
      abort.current?.abort();
      finish();
      setThreadId(thread?.id ?? null);
      setTitle(thread?.title ?? null);
      setMessages(hydrate(thread));
    },
    [finish],
  );

  const markProposal = useCallback(
    (answerKey: string, proposalId: string, status: ProposalStatus, edits?: Partial<ProposalEvent>) => {
      const target = messagesRef.current.find((m): m is Answer => m.role === "myte" && m.key === answerKey);
      patch(answerKey, (a) => setProposalStatus(a, proposalId, status, edits));
      if (target?.id) writeMark(`${target.id}:${proposalId}`, { status, title: edits?.title, due_date: edits?.due_date });
    },
    [patch],
  );

  const setFeedback = useCallback(
    (answerKey: string, feedback: -1 | 0 | 1, reason: string | null) => patch(answerKey, (a) => ({ ...a, feedback, feedbackReason: reason })),
    [patch],
  );

  const lastQuestion = [...messages].reverse().find((m): m is Question => m.role === "user")?.text ?? null;

  return { threadId, title, messages, streaming, now, send, stop, retry, reset, load, markProposal, setFeedback, lastQuestion };
}
