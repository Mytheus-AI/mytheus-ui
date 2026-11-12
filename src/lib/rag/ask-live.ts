/* "Ask your Myte, live" (polish program, Phase 1): the `POST /api/v1/ask` contract (bff, over
   rag-service) and the pure helpers the room's private ask box renders it with. The answer is a
   few sentences with `[n]` markers; each marker has a citation from a past meeting (what was
   said), a confirmed decision or task, or a company brain document. Nothing here is posted to the
   room: the question and the answer are the asker's alone.

   No React, no fetch: tested in tests/ask-live.test.ts. */

export type AskCitationKind = "transcript" | "document" | "decision" | "action";

export interface AskCitation {
  n: number;
  text: string;
  kind: string;
  meeting_id?: string | null;
  meeting_title?: string | null;
  occurred_at?: string | null;
  speaker?: string | null;
  decision_id?: string | null;
  action_id?: string | null;
  /** A company-brain passage's document (bff, wave 3). */
  document_id?: string | null;
  /** Where a transcript passage starts, ms from the meeting's start (bff, wave 3). */
  start_ms?: number | null;
}

export interface AskAnswer {
  question: string;
  answer?: string | null;
  abstained: boolean;
  degraded: boolean;
  citations: AskCitation[];
}

export type AskAgentResult =
  | { ok: true; data: AskAnswer }
  | { ok: false; reason: "not_connected" | "session" | "invalid" | "unavailable"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const seg = (id: string | null | undefined) => (id && UUID.test(id) ? encodeURIComponent(id) : null);

/** The kind, or "transcript" for anything unknown (bff's own default). */
export function citationKind(c: AskCitation): AskCitationKind {
  return c.kind === "document" || c.kind === "decision" || c.kind === "action" ? c.kind : "transcript";
}

/**
 * Where a citation opens, in a new tab so the call stays put. A meeting passage opens that
 * meeting's transcript (at the second, when the time is known); a decision opens its history; a
 * task opens My work. A company-brain document opens in place instead (`askCitationInline`):
 * no service serves a document page (ingestion-service only ingests), so everyone, admin or
 * member, reads the cited passage itself. Ids that are not UUIDs never reach an href.
 */
export function askCitationHref(c: AskCitation): string | null {
  const meeting = seg(c.meeting_id);
  switch (citationKind(c)) {
    case "transcript": {
      if (!meeting) return null;
      const t = typeof c.start_ms === "number" && c.start_ms >= 0 ? `#t=${Math.floor(c.start_ms / 1000)}` : "";
      return `/meetings/${meeting}/transcript${t}`;
    }
    case "decision": {
      const decision = seg(c.decision_id);
      if (meeting && decision) return `/meetings/${meeting}/decisions/${decision}`;
      return meeting ? `/meetings/${meeting}` : "/decisions";
    }
    case "action":
      return "/work/tasks";
    case "document":
      // Shown in place: see `askCitationInline`.
      return null;
  }
}

/** The chip's words: what the source is, in plain language. */
export function askCitationLabel(c: AskCitation, currentMeetingId?: string | null): string {
  const kind = citationKind(c);
  if (kind === "document") return "Company brain";
  if (kind === "decision") return "Confirmed decision";
  if (kind === "action") return "Confirmed task";
  if (c.meeting_id && currentMeetingId && c.meeting_id === currentMeetingId) return "Earlier in this meeting";
  return c.meeting_title?.trim() || "A past meeting";
}

/** "12:34" (or "1:02:03"): where a transcript passage starts, when bff sends it. */
export function askCitationTime(c: AskCitation): string | null {
  if (citationKind(c) !== "transcript" || typeof c.start_ms !== "number" || !Number.isFinite(c.start_ms) || c.start_ms < 0) return null;
  const total = Math.floor(c.start_ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** True for a company-brain passage the asker reads in place (a "Show passage" disclosure). */
export function askCitationInline(c: AskCitation): boolean {
  return citationKind(c) === "document" && c.text.trim().length > 0;
}

/** "Pricing review, Nov 4" or "Maya Chen, Nov 4": the quiet second line under a source. */
export function askCitationMeta(c: AskCitation, locale = "en-US"): string {
  const parts: string[] = [];
  const at = askCitationTime(c);
  if (at) parts.push(`at ${at}`);
  if (c.speaker?.trim()) parts.push(c.speaker.trim());
  if (citationKind(c) !== "transcript" && c.meeting_title?.trim()) parts.push(c.meeting_title.trim());
  if (c.occurred_at) {
    const d = new Date(c.occurred_at);
    if (!Number.isNaN(d.getTime())) parts.push(new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d));
  }
  return parts.join(", ");
}

/** A passage cut for the source list, on a word boundary. */
export function excerpt(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,.;:]$/, "")}...`;
}
