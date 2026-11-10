/* The `POST /api/rag/query` contract (rag-service, mytheus-docs doc 09 and ADR-0033) and the
   pure helpers the Ask page renders it with. No React, no fetch: tested in tests/rag-answer.test.ts.

   Every passage carries a citation of one of four kinds. The answer, when there is one, is a few
   sentences that each end in `[n]` markers pointing at those passages; rag-service has already
   removed any sentence that cites nothing, so a marker here always has a passage behind it. */

export type CitationKind = "transcript" | "document" | "decision" | "action";

export type RagCitation = {
  kind: CitationKind;
  meeting_id?: string | null;
  chunk_id?: string | null;
  speaker?: string | null;
  start_ms?: number | null;
  document_id?: string | null;
  element_id?: string | null;
  element_type?: string | null;
  decision_id?: string | null;
  action_id?: string | null;
};

export type RagPassage = {
  n: number;
  text: string;
  rerank_score: number;
  citation: RagCitation;
  context_before?: string | null;
  context_after?: string | null;
  meeting_title?: string | null;
  occurred_at?: string | null;
};

export type RagAnswer = { text: string; abstained: boolean; cited: number[] };

export type RagResponse = {
  answer_passages: RagPassage[];
  answer?: RagAnswer | null;
  expanded_queries?: string[];
  filters?: { date_from?: string | null; date_to?: string | null; person_ids?: string[]; source?: string | null };
  cache?: "hit" | "miss";
  degraded?: boolean;
};

export type AnswerSegment = { kind: "text"; text: string } | { kind: "cite"; n: number };

/** Split an answer into text runs and `[n]` citation markers, dropping markers that point at no
    passage (rag-service never sends one, but the page must not render a dead button). */
export function segmentAnswer(text: string, passageCount: number): AnswerSegment[] {
  const out: AnswerSegment[] = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    const n = Number(m[1]);
    if (n >= 1 && n <= passageCount) out.push({ kind: "cite", n });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** Where a citation opens. A transcript line opens the transcript at that second (the
    transcript view's `#t=` jump); a decision opens its lineage page; an action opens My Tasks.
    A company-brain document opens in place: no service serves a document page (ingestion-service
    only ingests), so the source card shows the cited passage with its context to everyone. */
export function citationHref(c: RagCitation): string | null {
  if (c.kind === "transcript" && c.meeting_id) {
    const seconds = Math.max(0, Math.floor((c.start_ms ?? 0) / 1000));
    return `/meetings/${c.meeting_id}/transcript#t=${seconds}`;
  }
  if (c.kind === "decision" && c.meeting_id && c.decision_id) {
    return `/meetings/${c.meeting_id}/decisions/${c.decision_id}`;
  }
  if (c.kind === "action") return "/work/tasks";
  return null;
}

export const KIND_LABEL: Record<CitationKind, string> = {
  transcript: "Said in a meeting",
  document: "Company brain",
  decision: "Confirmed decision",
  action: "Confirmed task",
};

/** "Pricing review, Nov 4, 12:31" style provenance line. */
export function provenance(p: RagPassage, locale = "en-US"): string {
  const parts: string[] = [];
  if (p.meeting_title) parts.push(p.meeting_title);
  if (p.occurred_at) {
    const d = new Date(p.occurred_at);
    if (!Number.isNaN(d.getTime())) {
      parts.push(new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d));
    }
  }
  if (p.citation.kind === "transcript" && p.citation.start_ms != null) {
    const s = Math.floor(p.citation.start_ms / 1000);
    parts.push(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  }
  if (p.citation.kind === "document" && p.citation.element_type) parts.push(p.citation.element_type);
  return parts.join(", ");
}
