/**
 * Ask Myte's numbered sources (ADR-0047 D5): where each one opens, what it is called and its
 * quiet second line. Built on the meeting room's ask helpers (`lib/rag/ask-live.ts`) for the four
 * kinds they already know (a transcript passage, a decision, a task, a company-brain passage),
 * extended to the four the Myte's tools add: a promise, a meeting, a person and an inbox item.
 *
 * Ids that are not UUIDs never reach an href. Pure, tested in tests/ask-myte-citations.test.ts.
 */

import { askCitationHref, askCitationMeta, askCitationTime, excerpt, type AskCitation } from "../rag/ask-live.ts";
import type { Source, SourceKind } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const seg = (id: string | null | undefined) => (id && UUID.test(id) ? encodeURIComponent(id) : null);

const KNOWN: readonly SourceKind[] = ["transcript", "decision", "action", "promise", "meeting", "document", "person", "notification"];

/** The kind, or "transcript" for anything unknown (bff's own default). */
export function sourceKind(s: Pick<Source, "kind">): SourceKind {
  return (KNOWN as readonly string[]).includes(s.kind) ? (s.kind as SourceKind) : "transcript";
}

function asCitation(s: Source): AskCitation {
  return {
    n: s.n,
    text: s.text ?? "",
    kind: sourceKind(s),
    meeting_id: s.meeting_id ?? null,
    meeting_title: s.meeting_title ?? null,
    occurred_at: s.occurred_at ?? null,
    speaker: s.speaker ?? null,
    decision_id: s.decision_id ?? null,
    action_id: s.action_id ?? null,
    document_id: s.document_id ?? null,
    start_ms: s.start_ms ?? null,
  };
}

/** Where a source opens: a transcript at its second, a decision's lineage, My work, a meeting,
    a person, the Inbox. A company-brain passage has no page: it is read in the sources panel. */
export function sourceHref(s: Source): string | null {
  const kind = sourceKind(s);
  switch (kind) {
    case "transcript":
    case "decision":
    case "action":
    case "document":
      return askCitationHref(asCitation(s));
    case "promise":
      return "/work/promises";
    case "meeting": {
      const m = seg(s.meeting_id);
      return m ? `/meetings/${m}` : "/meetings";
    }
    case "person": {
      const p = seg(s.person_id);
      return p ? `/people/${p}` : "/people";
    }
    case "notification":
      return "/inbox";
  }
}

/** What the source is, in plain words: the first line of a source card ("Transcript"). */
export function sourceKindLabel(s: Source): string {
  switch (sourceKind(s)) {
    case "transcript":
      return "Transcript";
    case "decision":
      return s.status === "superseded" ? "Superseded decision" : "Confirmed decision";
    case "action":
      return "Your task";
    case "promise":
      return "Your promise";
    case "meeting":
      return "Meeting";
    case "document":
      return "Company brain";
    case "person":
      return "Person";
    case "notification":
      return "Inbox";
  }
}

/** The source's own title, or its kind when the tool sent none. */
export function sourceTitle(s: Source): string {
  return (s.title ?? "").trim() || (sourceKind(s) === "transcript" ? s.meeting_title?.trim() || "A past meeting" : sourceKindLabel(s));
}

/** The quiet line under a source: "Sushan, at 11:14, Feature Update - Backend, Nov 12". */
export function sourceMeta(s: Source, locale = "en-US"): string {
  const kind = sourceKind(s);
  const parts: string[] = [];
  if (kind === "transcript" || kind === "decision" || kind === "action" || kind === "document") {
    const base = askCitationMeta(asCitation(s), locale);
    if (base) parts.push(base);
    if (kind === "transcript" && s.meeting_title?.trim() && s.meeting_title.trim() !== sourceTitle(s)) parts.push(s.meeting_title.trim());
  } else {
    if (s.meeting_title?.trim() && kind !== "meeting") parts.push(s.meeting_title.trim());
    const due = s.due_date ? new Date(`${s.due_date.slice(0, 10)}T12:00:00Z`) : null;
    if (due && !Number.isNaN(due.getTime())) parts.push(`Due ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(due)}`);
    else if (s.occurred_at) {
      const d = new Date(s.occurred_at);
      if (!Number.isNaN(d.getTime())) parts.push(new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d));
    }
  }
  return parts.join(", ");
}

/** "at 12:34" for a transcript passage with a start time, for the play-from-here link. */
export function sourceTime(s: Source): string | null {
  return askCitationTime(asCitation(s));
}

/** The passage, cut for a preview card. */
export function sourcePreview(s: Source, max = 180): string {
  return excerpt(s.text ?? "", max);
}

/** The words a link to the source says ("Open transcript at 12:34"). */
export function sourceLinkLabel(s: Source): string | null {
  if (!sourceHref(s)) return null;
  switch (sourceKind(s)) {
    case "transcript": {
      const t = sourceTime(s);
      return t ? `Play from ${t}` : "Open transcript";
    }
    case "decision":
      return "Open decision";
    case "action":
      return "Open My work";
    case "promise":
      return "Open promise ledger";
    case "meeting":
      return "Open meeting";
    case "person":
      return "Open profile";
    case "notification":
      return "Open Inbox";
    default:
      return null;
  }
}
