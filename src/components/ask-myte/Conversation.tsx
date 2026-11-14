"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowElbowDownRight, Copy, FileText, Repeat, SpeakerHigh, SpeakerSlash, ThumbsDown, ThumbsUp, WarningCircle } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { sendMyteFeedback } from "@/app/actions/myte-threads";
import { notifyError, notifySuccess } from "@/lib/toast";
import { failureCopy } from "@/lib/ask-myte/compose";
import { scopeLabel } from "@/lib/ask-myte/page-context";
import { isSlow, plainText, type Answer, type FaceState, type Message, type Proposal, type Question } from "@/lib/ask-myte/reducer";
import { matchesProposal } from "@/lib/ask-myte/peer";
import type { PeerQuestion, ProposalEvent } from "@/lib/ask-myte/types";
import { AnswerCard } from "./Cards";
import { Tip } from "./Tip";
import { ProposalCard } from "./ProposalCard";
import { AnswerText, MyteSignature, StepsLine } from "./parts";

/* The conversation: your questions with your doodle, the Myte's answers signed with its plush and
   name (D9), every state of an answer (D10), and what you can do with one: copy, read aloud in the
   Myte's voice, retry, Helpful / Not helpful with a reason. While an answer has focus, the number
   keys 1 to 9 open its sources. */

export type Persona = { name: string; seed: string };
export type Viewer = { name: string; email: string; seed?: string | null; image?: string | null };
export type Voice = {
  supported: boolean;
  speakingKey: string | null;
  speak: (key: string, text: string) => void;
  stop: () => void;
  /** the answer whose voice failed, and the quiet note to show under it (its text stays) */
  failed?: { key: string; note: string } | null;
};

const REASONS = ["Wrong", "Missing something", "Not what I asked", "Too long", "No sources"] as const;

function QuestionBubble({ q, viewer }: { q: Question; viewer: Viewer }) {
  return (
    <li className="flex justify-end gap-3">
      <div className="max-w-[min(560px,88%)] rounded-card rounded-tr-ctl bg-surface-2 px-4 py-3">
        <p className="sr-only">You asked:</p>
        <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink">{q.text}</p>
        {q.scope && q.scope.kind !== "all" ? <p className="mt-1.5 text-[13px] font-semibold text-ink-3">{scopeLabel(q.scope)}</p> : null}
        {q.attachments?.length ? (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Attached">
            {q.attachments.map((name) => (
              <li key={name} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[13px] text-ink-2">
                <FileText size={13} aria-hidden className="shrink-0 text-ink-3" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Avatar name={viewer.name} id={viewer.email} seed={viewer.seed} src={viewer.image} size="sm" className="mt-1" />
    </li>
  );
}

/* One quiet icon button under an answer, naming itself on hover and focus. */
function IconAction({
  label,
  onClick,
  children,
  pressed,
  expanded,
  controls,
  disabled = false,
  first = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  disabled?: boolean;
  first?: boolean;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        aria-expanded={expanded}
        aria-controls={controls}
        disabled={disabled}
        onClick={onClick}
        className={`grid h-9 w-9 place-items-center rounded-full transition-colors disabled:opacity-40 ${
          pressed ? "bg-signal-soft text-signal-ink" : "text-ink-3 hover:bg-bg-2 hover:text-ink"
        }`}
      >
        {children}
      </button>
      <Tip text={label} align={first ? "start" : "center"} />
    </span>
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
      <IconAction
        label={title ?? "Helpful"}
        pressed={answer.feedback === 1}
        disabled={!saved}
        onClick={() => void send(answer.feedback === 1 ? 0 : 1, null)}
      >
        <ThumbsUp size={17} weight={answer.feedback === 1 ? "fill" : "regular"} aria-hidden />
      </IconAction>
      <IconAction
        label={title ?? "Not helpful"}
        pressed={answer.feedback === -1}
        expanded={asking}
        controls={`${id}-why`}
        disabled={!saved}
        onClick={() => (answer.feedback === -1 ? void send(0, null) : setAsking((v) => !v))}
      >
        <ThumbsDown size={17} weight={answer.feedback === -1 ? "fill" : "regular"} aria-hidden />
      </IconAction>
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
  onRoutine,
  last,
  threadId,
  sentPeer,
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
  onRoutine?: () => void;
  last: boolean;
  threadId: string | null;
  sentPeer: PeerQuestion[];
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
              <ProposalCard
                key={p.id}
                proposal={p}
                threadId={threadId}
                isAdmin={isAdmin}
                peer={p.kind === "ask_myte" ? sentPeer.find((q) => matchesProposal(q, p)) ?? null : null}
                onSettled={(status, edits) => onProposal(p.id, status, edits)}
              />
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
          <nav className="mt-5 border-t border-line pt-3" aria-label="Ask next">
            <p className="px-1 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-ink-4">Ask next</p>
            <ul className="mt-1.5 flex list-none flex-col p-0">
              {answer.followups.map((f) => (
                <li key={f}>
                  <button
                    type="button"
                    onClick={() => onFollowup(f)}
                    className="group flex w-full items-start gap-2.5 rounded-ctl px-1 py-2 text-left text-[14.5px] leading-snug text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink"
                  >
                    <ArrowElbowDownRight size={15} aria-hidden className="mt-[3px] shrink-0 text-ink-4 transition-colors group-hover:text-signal" />
                    <span className="min-w-0">{f}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {settled && hasText ? (
          <div className="mt-2 flex flex-wrap items-center gap-0.5" role="group" aria-label="This answer">
            <IconAction
              label="Copy"
              first
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(plainText(answer.text))
                  .then(() => notifySuccess("Answer copied"))
                  .catch(() => notifyError("Couldn't copy. Select the text instead."));
              }}
            >
              <Copy size={17} aria-hidden />
            </IconAction>
            {voice.supported ? (
              <IconAction
                label={reading ? "Stop reading" : "Read aloud"}
                pressed={reading}
                onClick={() => (reading ? voice.stop() : voice.speak(answer.key, answer.text))}
              >
                {reading ? <SpeakerSlash size={17} weight="fill" aria-hidden /> : <SpeakerHigh size={17} aria-hidden />}
              </IconAction>
            ) : null}
            {last ? (
              <IconAction label="Retry" onClick={onRetry}>
                <ArrowClockwise size={17} aria-hidden />
              </IconAction>
            ) : null}
            {onRoutine && !answer.abstained ? (
              <IconAction label="Make this a routine" onClick={onRoutine}>
                <Repeat size={17} aria-hidden />
              </IconAction>
            ) : null}
            <span aria-hidden className="mx-1 h-4 w-px bg-line" />
            <Feedback answer={answer} onFeedback={onFeedback} />
          </div>
        ) : null}
        {settled && voice.failed?.key === answer.key ? (
          <p className="mt-2 text-[13.5px] text-ink-3" role="status">
            {voice.failed.note}
          </p>
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
  onRoutine,
  threadId = null,
  sentPeer = [],
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
  /** "Make this a routine" for the question an answer answered */
  onRoutine?: (question: string) => void;
  threadId?: string | null;
  /** questions this thread sent to teammates' Mytes, for confirmed ask_myte proposals */
  sentPeer?: PeerQuestion[];
}) {
  const lastAnswer = [...messages].reverse().find((m) => m.role === "myte")?.key;
  return (
    <ol className="space-y-8" aria-label="Conversation">
      {messages.map((m, i) =>
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
            onRoutine={onRoutine && messages[i - 1]?.role === "user" ? () => onRoutine((messages[i - 1] as Question).text) : undefined}
            threadId={threadId}
            sentPeer={sentPeer}
          />
        ),
      )}
    </ol>
  );
}
