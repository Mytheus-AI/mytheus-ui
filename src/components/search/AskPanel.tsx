"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowBendDownRight, Sparkle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
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
        <div className="rounded-card border border-line bg-surface px-6 py-12 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-bg-2 text-signal-deep">
            <Sparkle size={26} weight="fill" aria-hidden="true" />
          </span>
          <h2 className="display mt-4 text-[24px] text-ink-display">Ask about anything your meetings covered</h2>
          <p className="mx-auto mt-1.5 max-w-[48ch] text-[14px] text-ink-3">
            Mytheus searches the meetings you were in, your team&apos;s documents and confirmed
            decisions, then answers with numbered sources you can open.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">Try asking</h3>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
            {SUGGESTIONS.map((s) => (
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
        </div>
      </div>
    );
  }

  const heading = (
    <h2 className="display text-[clamp(1.4rem,2.4vw,1.75rem)] text-ink-display">{state.question}</h2>
  );

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <div className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6" aria-busy="true">
          <AnswerHead state="Searching your meetings" />
          <div className="flex flex-col gap-2.5">
            <span className="h-3.5 w-[92%] animate-pulse rounded-full bg-bg-2" />
            <span className="h-3.5 w-[78%] animate-pulse rounded-full bg-bg-2" />
            <span className="h-3.5 w-[64%] animate-pulse rounded-full bg-bg-2" />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <div className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
          <AnswerHead state="Not available" />
          <p role="alert" className="text-[15px] text-ink-2">
            {state.message}
          </p>
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
      className={`mx-0.5 inline-grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 align-[2px] text-[11.5px] font-bold leading-none tabular-nums transition-colors focus-visible:!rounded-full active:opacity-80 ${
        openCite === n ? "bg-pill text-white" : "bg-signal-soft text-signal-deep hover:brightness-95"
      }`}
    >
      {n}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      {heading}
      <div className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
        <AnswerHead state={headState} />

        {answer && !answer.abstained ? (
          <p className="max-w-[68ch] text-[16px] leading-[1.75] text-ink">
            {segmentAnswer(answer.text, passages.length).map((seg, i) =>
              seg.kind === "cite" ? cite(seg.n, `c${i}`) : <span key={`t${i}`}>{seg.text}</span>,
            )}
          </p>
        ) : answer?.abstained ? (
          <p role="status" className="max-w-[60ch] text-[16px] leading-relaxed text-ink">
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
            <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">Sources</h3>
            <ol className="mt-2">
              {passages.map((p) => (
                <li key={p.n}>
                  <button
                    type="button"
                    onClick={() => setOpenCite(openCite === p.n ? null : p.n)}
                    aria-expanded={openCite === p.n}
                    className="-mx-2.5 flex w-full items-start gap-3 rounded-pill px-2.5 py-2 text-left transition-colors hover:bg-bg active:bg-bg-2 focus-visible:!rounded-pill"
                  >
                    <span className="mt-0.5 grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-full bg-signal-soft px-1.5 text-[11.5px] font-bold tabular-nums text-signal-deep">
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

        <p className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-3">
          <Sparkle size={15} className="mt-px shrink-0" aria-hidden="true" />
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
      className="mt-4 rounded-card bg-bg p-4 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]"
      role="region"
      aria-label={`Source ${p.n}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{KIND_LABEL[p.citation.kind]}</Badge>
        {provenance(p) ? <span className="text-[12.5px] text-ink-3">{provenance(p)}</span> : null}
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        {p.context_before ? <span className="text-ink-3">{p.context_before} </span> : null}
        <span className="font-semibold text-ink">{p.text}</span>
        {p.context_after ? <span className="text-ink-3"> {p.context_after}</span> : null}
      </p>
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-signal-deep hover:underline hover:underline-offset-4 active:opacity-70"
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
