/**
 * The last word, the agreement check and pick up where we stopped, as pure helpers (a3 room
 * signals contract). Shared by the Inbox, the meeting page, the decision page, the room and the
 * server actions; type-only imports, so `node --test` reads it (tests/room-signals.test.ts).
 */

import type {
  AgreementAnswer,
  AgreementStrength,
  AgreementSummary,
  AudioMime,
  LastWordNudge,
  ResumePoint,
  SignalKind,
} from "./api/room-signals-types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isId(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/* ------------------------------------------------------------------ notifications */

export type SignalEvent =
  | { kind: "lastword"; nudgeId: string }
  | { kind: "agreement"; checkId: string }
  | { kind: "latecontribution"; contributionId: string };

/** Which room-signals job made a notification (`payload.source_event_id`), or null. */
export function parseSignalEvent(value: unknown): SignalEvent | null {
  if (typeof value !== "string") return null;
  const [prefix, id, ...rest] = value.trim().split(":");
  if (rest.length > 0 || !isId(id)) return null;
  const lower = id.toLowerCase();
  if (prefix === "lastword") return { kind: "lastword", nudgeId: lower };
  if (prefix === "agreement") return { kind: "agreement", checkId: lower };
  if (prefix === "latecontribution") return { kind: "latecontribution", contributionId: lower };
  return null;
}

/* ------------------------------------------------------------------ moments */

/** The transcript at that second (the transcript view's `#t=` jump). */
export function momentHref(meetingId: string, atMs: number | null | undefined): string {
  const base = `/meetings/${meetingId}/transcript`;
  if (atMs === null || atMs === undefined || !Number.isFinite(atMs)) return base;
  return `${base}#t=${Math.max(0, Math.floor(atMs / 1000))}`;
}

/** `12:04` on the meeting's clock. */
export function meetingClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/* ------------------------------------------------------------------ the last word */

/** Why your agent noticed, in the person's own terms (shown as the row's kicker). */
export const SIGNAL_LABEL: Record<SignalKind, string> = {
  cut_off: "You were cut off",
  spoken_over: "You were talked over",
  hand_not_called: "Your hand was not called",
  topic_silent: "A topic you follow came up",
};

function sentenceCase(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** The nudge's question when the server sent none (it always should). */
export function promptFor(kind: SignalKind, topic: string): string {
  const t = topic.trim() || "the discussion";
  if (kind === "hand_not_called") return `Your hand was up while the room discussed ${t}. Want to add your point?`;
  if (kind === "topic_silent") return `${sentenceCase(t)} came up and you listen for it. Want to add your view?`;
  return `You started to say something about ${t}. Want to add it?`;
}

export function nudgePrompt(n: Pick<LastWordNudge, "prompt" | "kind" | "topic">): string {
  return n.prompt?.trim() || promptFor(n.kind, n.topic);
}

export const LATE_LIMITS = {
  bodyMax: 2000,
  audioMaxMs: 180_000,
  audioMaxBytes: 2 * 1024 * 1024,
} as const;

const MIMES: AudioMime[] = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"];

/** The first recording format this browser can make that the server takes; null for none. */
export function pickAudioMime(supported: (mime: string) => boolean): { record: string; send: AudioMime } | null {
  const tries: { record: string; send: AudioMime }[] = [
    { record: "audio/webm;codecs=opus", send: "audio/webm" },
    { record: "audio/webm", send: "audio/webm" },
    { record: "audio/ogg;codecs=opus", send: "audio/ogg" },
    { record: "audio/mp4", send: "audio/mp4" },
    { record: "audio/mpeg", send: "audio/mpeg" },
  ];
  for (const t of tries) {
    try {
      if (supported(t.record)) return t;
    } catch {
      // a browser that throws on the question cannot record that format
    }
  }
  return null;
}

/** The server's accepted mime for a recorded blob type (codec parameters dropped). */
export function sendableMime(type: string): AudioMime | null {
  const base = type.split(";")[0].trim().toLowerCase();
  return (MIMES as string[]).includes(base) ? (base as AudioMime) : null;
}

export type LateDraft = { body: string; audio: { bytes: number; durationMs: number; mime: string } | null };
export type LateCheck = { ok: true; body: string | null } | { ok: false; field: "body" | "audio"; message: string };

/** A late contribution needs words or a recording, within the limits. */
export function checkLateDraft(draft: LateDraft): LateCheck {
  const body = draft.body.trim();
  if (body.length > LATE_LIMITS.bodyMax) {
    return { ok: false, field: "body", message: `Keep it to ${LATE_LIMITS.bodyMax} characters.` };
  }
  if (draft.audio) {
    if (!sendableMime(draft.audio.mime)) return { ok: false, field: "audio", message: "This recording format can't be sent. Write your point instead." };
    if (draft.audio.bytes > LATE_LIMITS.audioMaxBytes) return { ok: false, field: "audio", message: "The recording is too large. Record a shorter one." };
    if (draft.audio.durationMs > LATE_LIMITS.audioMaxMs + 1000) return { ok: false, field: "audio", message: "Recordings can be up to 3 minutes." };
    return { ok: true, body: body || null };
  }
  if (!body) return { ok: false, field: "body", message: "Write your point, or record it." };
  return { ok: true, body };
}

/** "1 late contribution", "3 late contributions". */
export function lateLabel(n: number): string {
  return `${n} late ${n === 1 ? "contribution" : "contributions"}`;
}

/** "2:05" for a recording's length. */
export function durationLabel(ms: number | null | undefined): string {
  return meetingClock(ms ?? 0);
}

/* ------------------------------------------------------------------ the agreement check */

export const ANSWER_COPY: Record<AgreementAnswer, { label: string; toast: string; outcome: string }> = {
  support: { label: "Support", toast: "Answer sent", outcome: "You support it." },
  concerns: { label: "Have concerns", toast: "Answer sent", outcome: "You have concerns." },
  object: { label: "Object", toast: "Answer sent", outcome: "You object." },
};

export const ANSWERS: AgreementAnswer[] = ["support", "concerns", "object"];

export const AGREEMENT_NOTE_MAX = 1000;

/** The chip a decision carries for its agreement read; null when there is nothing to flag. */
export function strengthChip(strength: AgreementStrength | null | undefined): { label: string; tone: "medium" | "low"; hint: string } | null {
  if (strength === "weak") {
    return {
      label: "Weak agreement",
      tone: "medium",
      hint: "Few people clearly said yes when this was decided. The people who hedged or stayed quiet were asked privately.",
    };
  }
  if (strength === "mixed") {
    return { label: "Mixed agreement", tone: "low", hint: "Some people hedged or stayed quiet when this was decided." };
  }
  return null;
}

export function strengthSentence(strength: AgreementStrength | null | undefined): string {
  switch (strength) {
    case "strong":
      return "Most people in the room clearly said yes.";
    case "mixed":
      return "Some people hedged or stayed quiet when this was decided.";
    case "weak":
      return "Few people clearly said yes when this was decided.";
    case "unclear":
      return "There was too little said around this decision to read how people felt.";
    default:
      return "The agreement read is not ready yet. It runs a few minutes after the meeting ends.";
  }
}

/** "3 of 5 actually support this". */
export function agreementHeadline(s: AgreementSummary): string {
  const n = Math.max(s.participants, s.support + s.concerns + s.object + s.pending);
  if (n === 0) return "Nobody has weighed in yet";
  return `${s.support} of ${n} actually ${s.support === 1 && n === 1 ? "supports" : "support"} this`;
}

export type AgreementSegment = { key: "support" | "concerns" | "object" | "pending"; label: string; n: number; pct: number };

/** The stacked bar: support, concerns, object, still waiting; percentages that add up to 100. */
export function agreementSegments(s: AgreementSummary): AgreementSegment[] {
  const raw: Omit<AgreementSegment, "pct">[] = [
    { key: "support", label: "Support", n: s.support },
    { key: "concerns", label: "Have concerns", n: s.concerns },
    { key: "object", label: "Object", n: s.object },
    { key: "pending", label: "Not answered yet", n: s.pending },
  ];
  const total = raw.reduce((a, r) => a + r.n, 0);
  if (total === 0) return raw.map((r) => ({ ...r, pct: 0 }));
  const exact = raw.map((r) => (r.n / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, frac: e - Math.floor(e) })).sort((a, b) => b.frac - a.frac);
  for (const o of order) {
    if (left <= 0) break;
    if (raw[o.i].n > 0) {
      floors[o.i] += 1;
      left -= 1;
    }
  }
  return raw.map((r, i) => ({ ...r, pct: floors[i] }));
}

/** The in-meeting read as one plain line, counts only (never who). */
export function inMeetingLine(s: AgreementSummary): string {
  const m = s.in_meeting;
  const parts = [
    m.yes ? `${m.yes} clearly said yes` : null,
    m.hedged ? `${m.hedged} hedged` : null,
    m.silent ? `${m.silent} stayed quiet` : null,
    m.objected ? `${m.objected} objected` : null,
    m.talked_over ? `${m.talked_over} ${m.talked_over === 1 ? "was" : "were"} talked over` : null,
  ].filter(Boolean);
  return parts.length ? `In the meeting: ${parts.join(", ")}.` : "Nothing was said around this decision in the meeting.";
}

/* ------------------------------------------------------------------ pick up where we stopped */

export const RESUME_REASON: Record<ResumePoint["reason"], string> = {
  cut_off: "Someone was cut off",
  time_ran_out: "Time ran out",
  agenda_unfinished: "Left unfinished",
};

/** The pin's line; the server's headline, or the same sentence built here. */
export function resumeHeadline(p: Pick<ResumePoint, "headline" | "reason" | "topic" | "cut_off">): string {
  if (p.headline?.trim()) return p.headline.trim();
  const topic = p.topic.trim() || "the last topic";
  if (p.reason === "cut_off" && p.cut_off?.name) return `${p.cut_off.name} was halfway through explaining ${topic}`;
  if (p.reason === "time_ran_out") return `Time ran out on ${topic}`;
  return `${sentenceCase(topic)} was left unfinished`;
}

/** The span to replay: the cut-off person's words, else the two positions. */
export function replaySpan(p: Pick<ResumePoint, "cut_off" | "positions">): { startMs: number; endMs: number } | null {
  if (p.cut_off) return { startMs: p.cut_off.start_ms, endMs: Math.max(p.cut_off.end_ms, p.cut_off.start_ms + 1000) };
  if (p.positions.length === 0) return null;
  const start = Math.min(...p.positions.map((x) => x.start_ms));
  const end = Math.max(...p.positions.map((x) => x.end_ms));
  return { startMs: start, endMs: Math.max(end, start + 1000) };
}

/** Whether the room should still show the pin. */
export function showResumePin(p: ResumePoint | null, hidden: ReadonlySet<string>): p is ResumePoint {
  return !!p && p.status === "open" && !hidden.has(p.id);
}
