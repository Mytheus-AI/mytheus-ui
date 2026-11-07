"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MagnifyingGlass, Sparkle, ArrowBendDownRight } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Highlight } from "./Highlight";
import {
  RECORDS,
  TYPE_LABEL,
  formatDate,
  haystack,
  questionTerms,
  score,
  type SearchRecord,
} from "./records";

/* The Ask answer card. There is no answer service yet, so the answer is ASSEMBLED, not generated:
   the best matching records are quoted in order, each followed by a numbered citation that opens
   its source. The card says so. Nothing streams and nothing is invented. */

const MAX_SOURCES = 3;

const chipButton =
  "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3 py-1.5 text-left text-[13px] font-semibold text-ink-2 transition-colors hover:border-signal hover:text-signal-deep active:bg-bg-2 focus-visible:!rounded-full";

function sentenceFor(r: SearchRecord): string {
  const body = r.snippet.trim();
  const head = r.type === "meeting" ? r.meetingTitle : r.title;
  return `${head}. ${body}`;
}

function findSources(question: string): { terms: string[]; sources: SearchRecord[] } {
  const terms = questionTerms(question);
  if (terms.length === 0) return { terms, sources: [] };
  const ranked = RECORDS.map((r) => {
    const hay = haystack(r);
    const hits = terms.filter((t) => hay.includes(t)).length;
    // decisions answer "what was decided" best, so they win ties
    return { r, s: hits === 0 ? 0 : hits * 4 + score(r, terms) + (r.type === "decision" ? 1 : 0) };
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return { terms, sources: ranked.slice(0, MAX_SOURCES).map((x) => x.r) };
}

export function AskPanel({
  question,
  suggestions,
  onAsk,
  onSearchInstead,
}: {
  question: string | null;
  suggestions: string[];
  onAsk: (q: string) => void;
  onSearchInstead: (q: string) => void;
}) {
  const [openCite, setOpenCite] = useState<number | null>(null);
  const [forQuestion, setForQuestion] = useState(question);
  // a new question closes any open source preview
  if (forQuestion !== question) {
    setForQuestion(question);
    setOpenCite(null);
  }

  const found = useMemo(() => (question ? findSources(question) : null), [question]);

  const suggestionList = (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onAsk(s)}
          className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 text-left text-[14px] font-semibold text-ink shadow-sm transition-colors hover:border-line-2 active:bg-bg focus-visible:!rounded-card"
        >
          <ArrowBendDownRight size={17} className="mt-0.5 shrink-0 text-signal-deep" aria-hidden="true" />
          <span>{s}</span>
        </button>
      ))}
    </div>
  );

  if (!question || !found) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-card border border-line bg-surface px-6 py-12 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-bg-2 text-signal-deep">
            <Sparkle size={26} weight="fill" aria-hidden="true" />
          </span>
          <h2 className="display mt-4 text-[24px] text-ink-display">Ask about anything your meetings covered</h2>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-[14px] text-ink-3">
            Mytheus finds the decisions, actions and meetings that match your question, then answers
            with numbered sources you can open.
          </p>
        </div>
        {suggestions.length > 0 ? (
          <div>
            <h3 className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">Try asking</h3>
            {suggestionList}
          </div>
        ) : null}
      </div>
    );
  }

  const { terms, sources } = found;

  if (sources.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="display text-[clamp(1.4rem,2.4vw,1.75rem)] text-ink-display">{question}</h2>
        <div className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
          <AnswerHead state="No answer" />
          <p role="status" className="max-w-[60ch] text-[16px] leading-relaxed text-ink">
            I could not find this in your meetings, so I will not guess. Try naming a project, a person
            or a decision.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <button type="button" onClick={() => onSearchInstead(question)} className={chipButton}>
              <MagnifyingGlass size={14} aria-hidden="true" />
              Search for &ldquo;{question.length > 28 ? `${question.slice(0, 28)}...` : question}&rdquo;
            </button>
          </div>
        </div>
        {suggestions.length > 0 ? (
          <div>
            <h3 className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">Try asking</h3>
            {suggestionList}
          </div>
        ) : null}
      </div>
    );
  }

  const open = openCite !== null ? sources[openCite] : null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="display text-[clamp(1.4rem,2.4vw,1.75rem)] text-ink-display">{question}</h2>
      <div className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
        <AnswerHead state={`${sources.length} ${sources.length === 1 ? "source" : "sources"}`} />

        <p className="max-w-[68ch] text-[16px] leading-[1.75] text-ink">
          {sources.map((r, i) => (
            <span key={r.id}>
              <Highlight text={sentenceFor(r)} terms={terms} />
              <button
                type="button"
                aria-expanded={openCite === i}
                aria-label={`Source ${i + 1}: ${r.title}`}
                onClick={() => setOpenCite(openCite === i ? null : i)}
                className={`mx-1 inline-grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 align-[2px] text-[11.5px] font-bold leading-none tabular-nums transition-colors focus-visible:!rounded-full active:opacity-80 ${
                  openCite === i
                    ? "bg-pill text-white"
                    : "bg-signal-soft text-signal-deep hover:brightness-95"
                }`}
              >
                {i + 1}
              </button>{" "}
            </span>
          ))}
        </p>

        {open ? (
          <div
            className="mt-4 rounded-card bg-bg p-4 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]"
            role="region"
            aria-label={`Source ${openCite! + 1}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{TYPE_LABEL[open.type]}</Badge>
              <span className="text-[12.5px] text-ink-3">{open.meetingTitle}</span>
            </div>
            <p className="mt-2 text-[15px] font-semibold text-ink">
              <Highlight text={open.title} terms={terms} />
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
              <Highlight text={open.snippet} terms={terms} />
            </p>
            <Link
              href={`/meetings/${open.meetingId}/room`}
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-signal-deep hover:underline hover:underline-offset-4 active:opacity-70"
            >
              Open meeting
              <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">Sources</h3>
          <ol className="mt-2">
            {sources.map((r, i) => (
              <li key={r.id}>
                <Link
                  href={`/meetings/${r.meetingId}/room`}
                  className="-mx-2.5 flex items-center gap-3 rounded-pill px-2.5 py-2 transition-colors hover:bg-bg active:bg-bg-2 focus-visible:!rounded-pill"
                >
                  <span className="grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-full bg-signal-soft px-1.5 text-[11.5px] font-bold tabular-nums text-signal-deep">
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5">
                    <span className="truncate text-[14px] font-semibold text-ink">{r.title}</span>
                    <span className="text-[12.5px] text-ink-3">
                      {TYPE_LABEL[r.type]}, {r.meetingTitle}
                      {formatDate(r.startTime) ? `, ${formatDate(r.startTime)}` : ""}
                    </span>
                  </span>
                  <ArrowUpRight size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" onClick={() => onSearchInstead(question)} className={chipButton}>
            <MagnifyingGlass size={14} aria-hidden="true" />
            See every match in Search
          </button>
        </div>
        <p className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-3">
          <Sparkle size={15} className="mt-px shrink-0" aria-hidden="true" />
          This answer is assembled from the records that match your question. It is not written by a
          model, so check a source before you rely on it.
        </p>
      </div>
    </div>
  );
}

function AnswerHead({ state }: { state: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 font-semibold text-ink">
      <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-pill text-white">
        <Sparkle size={15} weight="fill" aria-hidden="true" />
      </span>
      Mytheus
      <span role="status" className="ml-auto text-[13px] font-medium text-ink-3">
        {state}
      </span>
    </div>
  );
}
