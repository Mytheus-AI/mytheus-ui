/**
 * Ask Myte's message model (ADR-0047 D8, D9, D10): the stream's events reduced into one answer,
 * the face it wears while that happens, and the shapes it is stored as.
 *
 * One reducer serves both ends: the browser renders from it as events arrive, and the stream
 * route (`app/api/ask-myte/route.ts`) runs the same events through it to build what it stores, so
 * what you saw and what you get back from history cannot drift apart.
 *
 * Pure (no imports but the types), tested in tests/ask-myte-reducer.test.ts.
 */

import type {
  AskScope,
  CardEvent,
  ErrorReason,
  HistoryItem,
  MessagePayload,
  ProposalEvent,
  Source,
  StepEvent,
  StoredMessage,
  StreamEvent,
} from "./types.ts";
import { LIMITS } from "./types.ts";

export type ProposalStatus = "open" | "confirmed" | "dismissed";
export type Proposal = ProposalEvent & { status: ProposalStatus };

export type AnswerStatus = "streaming" | "done" | "stopped" | "error";
export type AnswerFailure = ErrorReason | "offline";

export interface Answer {
  /** a local key, stable for React from the first event */
  key: string;
  role: "myte";
  /** the stored message id, once `saved` arrives (feedback needs it) */
  id: string | null;
  status: AnswerStatus;
  text: string;
  steps: StepEvent[];
  sources: Source[];
  cards: CardEvent[];
  proposals: Proposal[];
  followups: string[];
  abstained: boolean;
  degraded: boolean;
  cited: number[];
  error: { reason: AnswerFailure; message: string } | null;
  feedback: -1 | 0 | 1;
  feedbackReason: string | null;
  /** ms timestamps: when the question went, and when the first words came */
  startedAt: number;
  firstTextAt: number | null;
  /** true once the stream route stored it; false if it said it could not */
  saved: boolean | null;
}

export interface Question {
  key: string;
  role: "user";
  id: string | null;
  text: string;
  scope: AskScope | null;
}

export type Message = Question | Answer;

export function newAnswer(key: string, now: number): Answer {
  return {
    key,
    role: "myte",
    id: null,
    status: "streaming",
    text: "",
    steps: [],
    sources: [],
    cards: [],
    proposals: [],
    followups: [],
    abstained: false,
    degraded: false,
    cited: [],
    error: null,
    feedback: 0,
    feedbackReason: null,
    startedAt: now,
    firstTextAt: null,
    saved: null,
  };
}

function upsert<T>(list: T[], item: T, same: (a: T) => boolean): T[] {
  const at = list.findIndex(same);
  if (at === -1) return [...list, item];
  const next = list.slice();
  next[at] = item;
  return next;
}

const str = (v: unknown, max = 4000): string => (typeof v === "string" ? v.slice(0, max) : "");

/** Fold one stream event into the answer. Events after the answer settled are ignored, except
    `saved`/`unsaved`, which arrive after `done` by design. */
export function reduceAnswer(a: Answer, ev: StreamEvent, now: number): Answer {
  if (ev.event === "saved") {
    const ids = Array.isArray(ev.data.message_ids) ? ev.data.message_ids : [];
    return { ...a, id: typeof ids[ids.length - 1] === "string" ? ids[ids.length - 1] : a.id, saved: true };
  }
  if (ev.event === "unsaved") return { ...a, saved: false };
  if (a.status !== "streaming") return a;

  switch (ev.event) {
    case "step": {
      const s = ev.data;
      if (!s || typeof s.id !== "string") return a;
      const state = s.state === "done" || s.state === "failed" ? s.state : "running";
      return { ...a, steps: upsert(a.steps, { id: s.id, label: str(s.label, 200), state }, (x) => x.id === s.id) };
    }
    case "delta": {
      const t = str(ev.data?.text, 20000);
      if (!t) return a;
      return { ...a, text: a.text + t, firstTextAt: a.firstTextAt ?? now };
    }
    case "source": {
      const s = ev.data;
      if (!s || !Number.isInteger(s.n) || s.n < 1) return a;
      const sources = upsert(a.sources, s, (x) => x.n === s.n).sort((x, y) => x.n - y.n);
      return { ...a, sources };
    }
    case "card": {
      const c = ev.data;
      if (!c || typeof c.kind !== "string") return a;
      return { ...a, cards: [...a.cards, { kind: c.kind, source_ns: Array.isArray(c.source_ns) ? c.source_ns : [], data: c.data ?? null }] };
    }
    case "proposal": {
      const p = ev.data;
      if (!p || typeof p.id !== "string" || typeof p.title !== "string") return a;
      return { ...a, proposals: upsert(a.proposals, { ...p, status: "open" as const }, (x) => x.id === p.id) };
    }
    case "followups": {
      const items = Array.isArray(ev.data?.items) ? ev.data.items.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
      return { ...a, followups: items.slice(0, 3).map((x) => x.trim().slice(0, 200)) };
    }
    case "title":
      return a;
    case "done":
      return {
        ...a,
        status: "done",
        abstained: ev.data?.abstained === true,
        degraded: ev.data?.degraded === true,
        cited: Array.isArray(ev.data?.cited) ? ev.data.cited.filter((n) => Number.isInteger(n)) : [],
        // a step still "running" when the answer is done finished without saying so
        steps: a.steps.map((s) => (s.state === "running" ? { ...s, state: "done" } : s)),
      };
    case "error":
      return {
        ...a,
        status: "error",
        error: { reason: ev.data?.reason ?? "unavailable", message: str(ev.data?.message, 500) },
        steps: a.steps.map((s) => (s.state === "running" ? { ...s, state: "failed" } : s)),
      };
    default:
      return a;
  }
}

/** The person pressed Stop (or Esc): keep what streamed so far. */
export function stopAnswer(a: Answer): Answer {
  if (a.status !== "streaming") return a;
  return { ...a, status: "stopped", steps: a.steps.map((s) => (s.state === "running" ? { ...s, state: "failed" } : s)) };
}

/** The stream broke without an `error` event (network, offline, an upstream that went quiet). */
export function failAnswer(a: Answer, reason: AnswerFailure, message = ""): Answer {
  if (a.status !== "streaming") return a;
  return { ...a, status: "error", error: { reason, message }, steps: a.steps.map((s) => (s.state === "running" ? { ...s, state: "failed" } : s)) };
}

export function setProposalStatus(a: Answer, id: string, status: ProposalStatus, edits?: Partial<ProposalEvent>): Answer {
  return { ...a, proposals: a.proposals.map((p) => (p.id === id ? { ...p, ...(edits ?? {}), status } : p)) };
}

/* ---------------- the title ---------------- */

/** The `title` event's text, if the stream sent one. */
export function titleFrom(events: readonly StreamEvent[]): string | null {
  for (const ev of events) if (ev.event === "title" && typeof ev.data?.text === "string" && ev.data.text.trim()) return ev.data.text.trim().slice(0, LIMITS.title);
  return null;
}

/** A new thread's title when the stream did not name it: the question, trimmed on a word. */
export function fallbackTitle(question: string): string {
  const flat = question.replace(/\s+/g, " ").trim();
  if (flat.length <= 60) return flat || "New question";
  const cut = flat.slice(0, 60);
  const at = cut.lastIndexOf(" ");
  return `${(at > 30 ? cut.slice(0, at) : cut).replace(/[,.;:?!]$/, "")}...`;
}

/* ---------------- stored shapes ---------------- */

/** What a Myte message keeps besides its text, kept under the 64 KB payload limit: long source
    passages are cut first, then the detail of cards, so the answer's own shape always survives. */
export function toPayload(a: Answer): MessagePayload {
  const payload: MessagePayload = {
    steps: a.steps,
    sources: a.sources,
    cards: a.cards,
    proposals: a.proposals.map(({ status, ...p }) => ({ ...p, confirmed: status === "confirmed" })),
    followups: a.followups,
    abstained: a.abstained,
    degraded: a.degraded,
  };
  const size = () => new TextEncoder().encode(JSON.stringify(payload)).length;
  if (size() <= LIMITS.payloadBytes) return payload;
  payload.sources = a.sources.map((s) => ({ ...s, text: s.text.slice(0, 400) }));
  payload.cards = a.cards.map((c) => ({ ...c, data: { items: c.data?.items?.map((s) => ({ ...s, text: s.text.slice(0, 200) })), detail: null } }));
  if (size() <= LIMITS.payloadBytes) return payload;
  payload.sources = a.sources.map((s) => ({ ...s, text: s.text.slice(0, 120) }));
  payload.cards = a.cards.map((c) => ({ ...c, data: null }));
  return payload;
}

const toFeedback = (v: unknown): -1 | 0 | 1 => (v === 1 || v === -1 ? v : 0);

/** A stored message back into the model the page renders. */
export function fromStored(m: StoredMessage): Message {
  if (m.role === "user") {
    return { key: m.id, role: "user", id: m.id, text: m.content, scope: m.payload?.scope ?? null };
  }
  const p = m.payload ?? {};
  return {
    ...newAnswer(m.id, 0),
    id: m.id,
    status: "done",
    text: m.content,
    steps: Array.isArray(p.steps) ? p.steps : [],
    sources: Array.isArray(p.sources) ? [...p.sources].sort((x, y) => x.n - y.n) : [],
    cards: Array.isArray(p.cards) ? p.cards : [],
    proposals: Array.isArray(p.proposals)
      ? p.proposals.map(({ confirmed, ...rest }) => ({ ...rest, status: confirmed ? ("confirmed" as const) : ("open" as const) }))
      : [],
    followups: Array.isArray(p.followups) ? p.followups : [],
    abstained: p.abstained === true,
    degraded: p.degraded === true,
    feedback: toFeedback(m.feedback),
    feedbackReason: m.feedback_reason ?? null,
    saved: true,
  };
}

/** The last 12 turns for the loop (D8): questions, and the answers that finished. */
export function historyFrom(messages: readonly (Message | StoredMessage)[]): HistoryItem[] {
  const out: HistoryItem[] = [];
  for (const m of messages) {
    if ("status" in m && m.status !== "done") continue;
    const content = "content" in m ? m.content : m.text;
    if (!content.trim()) continue;
    out.push({ role: m.role, content: content.slice(0, LIMITS.historyItem) });
  }
  return out.slice(-LIMITS.history);
}

/* ---------------- the face (D9) ---------------- */

export type FaceState = "idle" | "listening" | "thinking" | "speaking" | "happy";

/**
 * Which state the Myte's plush is in. In order: it hops once after a confirm; it speaks while
 * words stream in or while it reads an answer aloud; it thinks while it is looking things up
 * (the question went, no words yet); it listens while the person types; otherwise it idles.
 */
export function faceState(input: {
  answer: Pick<Answer, "status" | "text"> | null;
  typing: boolean;
  reading: boolean;
  happy: boolean;
}): FaceState {
  if (input.happy) return "happy";
  if (input.reading) return "speaking";
  const a = input.answer;
  if (a && a.status === "streaming") return a.text ? "speaking" : "thinking";
  if (input.typing) return "listening";
  return "idle";
}

/** The state in words, for the header and screen readers ("Pip is looking"). */
export function faceWords(state: FaceState, name: string): string {
  switch (state) {
    case "thinking":
      return `${name} is looking`;
    case "speaking":
      return `${name} is answering`;
    case "listening":
      return `${name} is listening`;
    case "happy":
      return `${name} is pleased`;
    default:
      return `${name} is here`;
  }
}

/** The short label beside the name in the header ("speaking"). */
export function faceLabel(state: FaceState): string {
  return state === "thinking" ? "looking" : state === "speaking" ? "speaking" : state === "listening" ? "listening" : state === "happy" ? "done" : "ready";
}

/* ---------------- states (D10) ---------------- */

export const SLOW_MS = 8000;

/** Still streaming and nothing to read after 8 seconds: say "Still looking". */
export function isSlow(a: Pick<Answer, "status" | "text" | "startedAt">, now: number): boolean {
  return a.status === "streaming" && !a.text && now - a.startedAt >= SLOW_MS;
}

/** The answer's text without its `[n]` markers (copy, read aloud, the screen-reader summary). */
export function plainText(text: string): string {
  return text
    .replace(/\s?\[(\d+)\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** The numbers a text cites, in order of first use, that have a source. */
export function citedIn(text: string, sources: readonly Pick<Source, "n">[]): number[] {
  const have = new Set(sources.map((s) => s.n));
  const out: number[] = [];
  const re = /\[(\d+)\]/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const n = Number(m[1]);
    if (have.has(n) && !out.includes(n)) out.push(n);
  }
  return out;
}
