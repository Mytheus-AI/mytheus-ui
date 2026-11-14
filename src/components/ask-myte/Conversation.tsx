"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, Copy, SpeakerHigh, SpeakerSlash, ThumbsDown, ThumbsUp, WarningCircle } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { sendMyteFeedback } from "@/app/actions/myte-threads";
import { notifyError, notifySuccess } from "@/lib/toast";
import { failureCopy } from "@/lib/ask-myte/compose";
import { scopeLabel } from "@/lib/ask-myte/page-context";
import { isSlow, plainText, type Answer, type FaceState, type Message, type Proposal, type Question } from "@/lib/ask-myte/reducer";
import type { ProposalEvent } from "@/lib/ask-myte/types";
import { AnswerCard } from "./Cards";
import { ProposalCard } from "./ProposalCard";
import { AnswerText, MyteSignature, StepsLine } from "./parts";

/* The conversation: your questions with your doodle, the Myte's answers signed with its plush and
   name (D9), every state of an answer (D10), and what you can do with one: copy, read aloud in the
   Myte's voice, retry, Helpful / Not helpful with a reason. While an answer has focus, the number
   keys 1 to 9 open its sources. */

export type Persona = { name: string; seed: string };
export type Viewer = { name: string; email: string; seed?: string | null; image?: string | null };
export type Voice = { supported: boolean; speakingKey: string | null; speak: (key: string, text: string) => void; stop: () => void };

const REASONS = ["Wrong", "Missing something", "Not what I asked", "Too long", "No sources"] as const;

function QuestionBubble({ q, viewer }: { q: Question; viewer: Viewer }) {
  return (
    <li className="flex justify-end gap-3">
      <div className="max-w-[min(560px,88%)] rounded-card rounded-tr-ctl bg-surface-2 px-4 py-3">
        <p className="sr-only">You asked:</p>
        <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink">{q.text}</p>
        {q.scope && q.scope.kind !== "all" ? <p className="mt-1.5 text-[13px] font-semibold text-ink-3">{scopeLabel(q.scope)}</p> : null}
      </div>
      <Avatar name={viewer.name} id={viewer.email} seed={viewer.seed} src={viewer.image} size="sm" className="mt-1" />
    </li>
  );
}

function Feedback({ answer, onFeedback }: { answer: Answer; onFeedback: (fb: -1 | 0 | 1, reason: string | null) => void }) {
  const [asking, setAsking] = useState(false);
  const [other, setOther] = useState("");
  const id = useId();
  const saved = !!answer.id;
  const send = async (fb: -1 | 0 | 1, reason: string | null) => {
    if (!answer.id) return;
    const before = { fb: answer.feedback, reason: answer.feedbackReason };
    onFeedback(fb, reason);
    const res = await sendMyteFeedback(answer.id, fb, reason);
    if (!res.ok) {
      onFeedback(before.fb, before.reason);
      notifyError(res.message);
    } else if (fb !== 0) notifySuccess("Thanks for the feedback");
  };
  const title = saved ? undefined : "Feedback works once the answer is saved";
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        aria-pressed={answer.feedback === 1}
        disabled={!saved}
        title={title}
        onClick={() => void send(answer.feedback === 1 ? 0 : 1, null)}
        className={answer.feedback === 1 ? "!text-signal-ink" : ""}
      >
        <ThumbsUp size={16} weight={answer.feedback === 1 ? "fill" : "regular"} aria-hidden />
        Helpful
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-pressed={answer.feedback === -1}
        aria-expanded={asking}
        aria-controls={`${id}-why`}
        disabled={!saved}
        title={title}
        onClick={() => (answer.feedback === -1 ? void send(0, null) : setAsking((v) => !v))}
        className={answer.feedback === -1 ? "!text-signal-ink" : ""}
      >
        <ThumbsDown size={16} weight={answer.feedback === -1 ? "fill" : "regular"} aria-hidden />
        Not helpful
      </Button>
      {asking ? (
        <div id={`${id}-why`} className="basis-full rounded-card border border-line bg-surface p-3.5">
          <p className="text-[14px] font-semibold text-ink">What was wrong with it?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setAsking(false);
                  void send(-1, r);
                }}
                className="min-h-9 rounded-full border border-line-2 bg-surface px-3.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {r}
              </button>
            ))}
          </div>
          <form
            className="mt-2.5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!other.trim()) return;
              setAsking(false);
              void send(-1, other.trim());
            }}
          >
            <label htmlFor={`${id}-o`} className="sr-only">
              Something else
            </label>
            <input
              id={`${id}-o`}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={500}
              placeholder="Something else"
              className="h-9 min-w-0 flex-1 rounded-ctl border border-line-2 bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3"
            />
            <Button type="submit" size="sm" variant="outline" disabled={!other.trim()}>
              Send
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}

function AnswerBlock({
  answer,
  persona,
  face,
  now,
  isAdmin,
  voice,
  onOpenSource,
  onRetry,
  onFollowup,
  onProposal,
  onFeedback,
  last,
}: {
  answer: Answer;
  persona: Persona;
  face: FaceState;
  now: number;
  isAdmin: boolean;
  voice: Voice;
  onOpenSource: (n: number) => void;
  onRetry: () => void;
  onFollowup: (q: string) => void;
  onProposal: (id: string, status: Proposal["status"], edits?: Partial<ProposalEvent>) => void;
  onFeedback: (fb: -1 | 0 | 1, reason: string | null) => void;
  last: boolean;
}) {
  const streaming = answer.status === "streaming";
  const slow = isSlow(answer, now);
  const failure =
    answer.status === "stopped"
      ? failureCopy("stopped", { name: persona.name })
      : answer.status === "error" && answer.error
        ? failureCopy(answer.error.reason, { name: persona.name, message: answer.error.message, isAdmin })
        : null;
  const reading = voice.speakingKey === answer.key;
  const settled = answer.status === "done";
  const hasText = answer.text.trim().length > 0;

  return (
    <li>
      <article
        tabIndex={0}
        data-ask-column=""
        aria-label={`${persona.name}'s answer`}
        aria-busy={streaming || undefined}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return;
          if (/^[1-9]$/.test(e.key)) {
            const n = Number(e.key);
            if (answer.sources.some((s) => s.n === n)) {
              e.preventDefault();
              onOpenSource(n);
            }
          }
        }}
        className="rounded-card outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
      >
        <MyteSignature seed={persona.seed} name={persona.name} state={last ? face : undefined} live={last} />

        <StepsLine steps={answer.steps} streaming={streaming} />
        {streaming && answer.steps.length === 0 && !hasText ? (
          <p className="mt-3 text-[14px] text-ink-3">Looking...</p>
        ) : null}
        {slow ? (
          <p className="mt-2 text-[14px] font-semibold text-ink-3" role="status">
            Still looking…
          </p>
        ) : null}

        {settled && answer.abstained ? <p className="mt-3 text-[13px] font-semibold text-ink-3">Nothing found</p> : null}
        {hasText ? (
          <div className="mt-3">
            <AnswerText text={answer.text} sources={answer.sources} onOpen={onOpenSource} streaming={streaming} />
          </div>
        ) : null}

        {answer.cards.length ? (
          <div className="mt-4 space-y-3">
            {answer.cards.map((c, i) => (
              <AnswerCard key={i} card={c} sources={answer.sources} onOpen={onOpenSource} />
            ))}
          </div>
        ) : null}

        {answer.proposals.length ? (
          <div className="mt-4 space-y-3">
            {answer.proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} onSettled={(status, edits) => onProposal(p.id, status, edits)} />
            ))}
          </div>
        ) : null}

        {settled && answer.degraded ? (
          <p className="mt-3 text-[13.5px] text-ink-3">A shorter answer than usual: your workspace&apos;s AI budget is nearly used.</p>
        ) : null}
        {answer.saved === false ? <p className="mt-3 text-[13.5px] text-ink-3">This answer couldn&apos;t be saved to your history.</p> : null}

        {failure ? (
          <div className={`mt-4 rounded-card border px-4 py-3.5 ${answer.status === "stopped" ? "border-line bg-surface-2" : "border-line bg-surface"}`} role="alert">
            <p className="flex items-start gap-2 text-[15px] text-ink">
              {answer.status === "stopped" ? null : <WarningCircle size={18} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-priority-medium" />}
              <span>
                <span className="font-semibold">{failure.title}</span> <span className="text-ink-2">{failure.detail}</span>
              </span>
            </p>
            {failure.retry || failure.action ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {failure.retry && last ? (
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    <ArrowClockwise size={15} weight="bold" aria-hidden />
                    Retry
                  </Button>
                ) : null}
                {failure.action ? (
                  answer.error?.reason === "session" ? (
                    <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                      {failure.action.label}
                    </Button>
                  ) : (
                    <Link href={failure.action.href} className="inline-flex h-9 items-center rounded-ctl border border-line-2 bg-surface px-3.5 text-[14px] font-semibold text-ink hover:bg-surface-2">
                      {failure.action.label}
                    </Link>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {settled && answer.followups.length && last ? (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Ask next">
            {answer.followups.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFollowup(f)}
                className="min-h-10 rounded-full border border-line-2 bg-surface px-4 text-left text-[14px] font-medium text-ink-2 transition-colors hover:border-signal-line hover:text-ink"
              >
                {f}
              </button>
            ))}
          </div>
        ) : null}

        {settled && hasText ? (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(plainText(answer.text))
                  .then(() => notifySuccess("Answer copied"))
                  .catch(() => notifyError("Couldn't copy. Select the text instead."));
              }}
            >
              <Copy size={16} aria-hidden />
              Copy
            </Button>
            {voice.supported ? (
              <Button size="sm" variant="ghost" aria-pressed={reading} onClick={() => (reading ? voice.stop() : voice.speak(answer.key, answer.text))}>
                {reading ? <SpeakerSlash size={16} aria-hidden /> : <SpeakerHigh size={16} aria-hidden />}
                {reading ? "Stop reading" : "Read aloud"}
              </Button>
            ) : null}
            {last ? (
              <Button size="sm" variant="ghost" onClick={onRetry}>
                <ArrowClockwise size={16} aria-hidden />
                Retry
              </Button>
            ) : null}
            <Feedback answer={answer} onFeedback={onFeedback} />
          </div>
        ) : null}
      </article>
    </li>
  );
}

export function Conversation({
  messages,
  persona,
  viewer,
  face,
  now,
  isAdmin,
  voice,
  onOpenSource,
  onRetry,
  onFollowup,
  onProposal,
  onFeedback,
}: {
  messages: Message[];
  persona: Persona;
  viewer: Viewer;
  face: FaceState;
  now: number;
  isAdmin: boolean;
  voice: Voice;
  onOpenSource: (answerKey: string, n: number) => void;
  onRetry: (answerKey: string) => void;
  onFollowup: (q: string) => void;
  onProposal: (answerKey: string, id: string, status: Proposal["status"], edits?: Partial<ProposalEvent>) => void;
  onFeedback: (answerKey: string, fb: -1 | 0 | 1, reason: string | null) => void;
}) {
  const lastAnswer = [...messages].reverse().find((m) => m.role === "myte")?.key;
  return (
    <ol className="space-y-8" aria-label="Conversation">
      {messages.map((m) =>
        m.role === "user" ? (
          <QuestionBubble key={m.key} q={m} viewer={viewer} />
        ) : (
          <AnswerBlock
            key={m.key}
            answer={m}
            persona={persona}
            face={face}
            now={now}
            isAdmin={isAdmin}
            voice={voice}
            last={m.key === lastAnswer}
            onOpenSource={(n) => onOpenSource(m.key, n)}
            onRetry={() => onRetry(m.key)}
            onFollowup={onFollowup}
            onProposal={(id, status, edits) => onProposal(m.key, id, status, edits)}
            onFeedback={(fb, reason) => onFeedback(m.key, fb, reason)}
          />
        ),
      )}
    </ol>
  );
}
