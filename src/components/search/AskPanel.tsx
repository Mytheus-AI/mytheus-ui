"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowUpRight, ArrowBendDownRight, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { Chip } from "@/components/ui/Chip";
import { cardClass } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bone } from "@/components/ui/Page";
import {
  KIND_LABEL,
  citationHref,
  provenance,
  segmentAnswer,
  type RagPassage,
  type RagResponse,
} from "@/lib/rag/answer";

/* The Ask answer card, on rag-service (mytheus-docs ADR-0033). The answer is written by a model
   from the numbered passages only, and rag-service has already removed any sentence that cites
   nothing; every [n] here opens its source. When the passages do not hold the answer, it says
   so instead of guessing. When the workspace is over its AI budget, the passages still come
   back, without a written answer. */

export type AskState =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "error"; question: string; message: string }
  | { status: "done"; question: string; result: RagResponse };

const SUGGESTIONS = [
  "What did we decide about pricing?",
  "When is the launch?",
  "What are my open action items about?",
  "What did we agree in last week's meetings?",
];

export function AskPanel({ state, onAsk }: { state: AskState; onAsk: (q: string) => void }) {
  const [openCite, setOpenCite] = useState<number | null>(null);
  const [forState, setForState] = useState(state);
  // a new question closes any open source preview
  if (forState !== state) {
    setForState(state);
    setOpenCite(null);
  }

  if (state.status === "idle") {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          art="search"
          title="Ask about anything your meetings covered"
          description="Mytheus searches the meetings you were in, your team's documents and confirmed decisions, then answers with numbered sources you can open."
        />
        <section aria-labelledby="ask-try-heading">
          <h2 id="ask-try-heading" className="kicker mb-3">
            Try asking
          </h2>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAsk(s)}
                className={cardClass({ className: "flex min-h-[52px] items-start gap-3 text-left text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-line-2 active:bg-surface-2" })}
              >
                <ArrowBendDownRight size={17} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
                <span>{s}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const heading = (
    <h2 className="display text-[22px] text-ink-display">{state.question}</h2>
  );

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <div className={answerCard} aria-busy="true">
          <AnswerHead state="Searching your meetings" />
          <div className="flex flex-col gap-2.5">
            <Bone className="h-3.5 w-[92%] !rounded-full" />
            <Bone className="h-3.5 w-[78%] !rounded-full" />
            <Bone className="h-3.5 w-[64%] !rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <div className={answerCard}>
          <AnswerHead state="Not available" />
          <p role="alert" className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
            {state.message}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => onAsk(state.question)}>
            <ArrowClockwise size={15} weight="bold" aria-hidden />
            Ask again
          </Button>
        </div>
      </div>
    );
  }

  const { result } = state;
  const passages = result.answer_passages;
  const answer = result.answer;
  const open = openCite !== null ? passages.find((p) => p.n === openCite) ?? null : null;
  const headState = answer?.abstained
    ? "No answer"
    : `${passages.length} ${passages.length === 1 ? "source" : "sources"}`;

  const cite = (n: number, key: string) => (
    <button
      key={key}
      type="button"
      aria-expanded={openCite === n}
      aria-label={`Source ${n}`}
      onClick={() => setOpenCite(openCite === n ? null : n)}
      className={`mx-0.5 inline-grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 align-[2px] text-[12.5px] font-bold leading-none tabular-nums transition-colors active:opacity-80 ${
        openCite === n ? "bg-pill text-pill-on" : "bg-signal-soft text-signal-ink hover:bg-pill hover:text-pill-on"
      }`}
    >
      {n}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      {heading}
      <div className={answerCard}>
        <AnswerHead state={headState} />

        {answer && !answer.abstained ? (
          <p className="max-w-[68ch] text-[17px] leading-[1.7] text-ink">
            {segmentAnswer(answer.text, passages.length).map((seg, i) =>
              seg.kind === "cite" ? cite(seg.n, `c${i}`) : <span key={`t${i}`}>{seg.text}</span>,
            )}
          </p>
        ) : answer?.abstained ? (
          <p role="status" className="max-w-[60ch] text-[17px] leading-relaxed text-ink">
            I couldn&apos;t find this in your meetings or documents, so I won&apos;t guess.
            {passages.length > 0 ? " These were the closest matches." : " Try naming a project, a person or a decision."}
          </p>
        ) : (
          <p role="status" className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
            {result.degraded
              ? "Your workspace has used its AI allowance for this period, so here are the matching sources without a written answer."
              : "Here are the matching sources."}
          </p>
        )}

        {open ? <SourcePreview p={open} /> : null}

        {passages.length > 0 ? (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="kicker">Sources</h3>
            <ol className="mt-2">
              {passages.map((p) => (
                <li key={p.n}>
                  <button
                    type="button"
                    onClick={() => setOpenCite(openCite === p.n ? null : p.n)}
                    aria-expanded={openCite === p.n}
                    className="-mx-2.5 flex w-[calc(100%+20px)] items-start gap-3 rounded-ctl px-2.5 py-2 text-left transition-colors hover:bg-surface-2 active:bg-bg-2"
                  >
                    <span className="mt-0.5 grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-full bg-signal-soft px-1.5 text-[12.5px] font-bold tabular-nums text-signal-ink">
                      {p.n}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="line-clamp-2 text-[14px] font-semibold text-ink">{p.text}</span>
                      <span className="text-[12.5px] text-ink-3">
                        {KIND_LABEL[p.citation.kind]}
                        {provenance(p) ? `, ${provenance(p)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-[12.5px] text-ink-3">
          <ShieldCheck size={16} className="mt-px shrink-0" aria-hidden="true" />
          Answers come only from meetings you were in, your team&apos;s documents and confirmed
          decisions. Open a source before you rely on it.
        </p>
      </div>
    </div>
  );
}

function SourcePreview({ p }: { p: RagPassage }) {
  const href = citationHref(p.citation);
  return (
    <div
      className="mx-pop mt-4 rounded-ctl border border-line bg-surface-2 p-4"
      role="region"
      aria-label={`Source ${p.n}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip>{KIND_LABEL[p.citation.kind]}</Chip>
        {provenance(p) ? <span className="text-[12.5px] text-ink-3">{provenance(p)}</span> : null}
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        {p.context_before ? <span className="text-ink-3">{p.context_before} </span> : null}
        <span className="font-semibold text-ink">{p.text}</span>
        {p.context_after ? <span className="text-ink-3"> {p.context_after}</span> : null}
      </p>
      {p.citation.kind === "document" ? (
        <p className="mt-3 text-[13px] text-ink-3">The cited part of a company brain document, shown here in full context.</p>
      ) : null}
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-ctl text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline active:opacity-70"
        >
          {p.citation.kind === "transcript"
            ? "Open in transcript"
            : p.citation.kind === "decision"
              ? "Open decision history"
              : "Open My Tasks"}
          <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

const answerCard = cardClass();

function AnswerHead({ state }: { state: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 font-semibold text-ink">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-pill text-pill-on">
        <Sparkle size={15} weight="fill" aria-hidden="true" />
      </span>
      Mytheus
      <span role="status" className="ml-auto text-[12.5px] font-medium text-ink-3">
        {state}
      </span>
    </div>
  );
}
