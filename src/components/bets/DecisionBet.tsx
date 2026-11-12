"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowCounterClockwise,
  CalendarCheck,
  CheckCircle,
  ClockCountdown,
  MinusCircle,
  PencilSimple,
  Quotes,
  Sparkle,
  Target,
  XCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyArtwork } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { notifyError, notifySuccess } from "@/lib/toast";
import { resolveBet, saveBet, stepBet, type BetResult } from "@/app/actions/bets";
import type { Bet, BetUpsert, DecisionBetView, Outcome } from "@/lib/api/bets-types";
import {
  CATEGORY_LABEL,
  OUTCOME_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  daysUntil,
  expectationLine,
  formatDay,
  relativeDay,
  sizeLabel,
  statusTone,
} from "@/lib/bets";
import { BetEditor } from "./BetEditor";
import { BetEvidenceList } from "./BetEvidence";
import { BetLessons } from "./BetLessons";
import { BetResolveForm } from "./BetResolveForm";
import { OutcomeChip } from "./OutcomeChip";

/* "What this decision bets on": the expected outcome of one decision, on its record page.

   - none yet: an invitation to say what it should achieve (for the owner, host or confirmer);
   - suggested: what the agent heard in the meeting, with the words it heard, to keep, edit or
     dismiss (Undo brings it back);
   - waiting: the bet and its check date;
   - ready to score: the evidence the check gathered and the owner's call, the suggestion from a
     connected metric chosen for them but never taken without them;
   - scored: hit, partly or missed, the lesson, and Reopen.

   Anyone in the meeting reads it; only the bet's owner, the host or whoever confirmed the decision
   changes it (the server decides; `can_edit` only hides what would be refused). */

type Mode = "view" | "edit" | "resolve";

const OUTCOME_ICON = { hit: CheckCircle, partly: MinusCircle, missed: XCircle } as const;

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] font-semibold text-ink-3">{term}</dt>
      <dd className="mt-1 text-[14.5px] text-ink">{children}</dd>
    </div>
  );
}

function BetFacts({ bet, today }: { bet: Bet; today: string }) {
  const due = daysUntil(bet.check_date, today);
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
      <Fact term="Expected">{expectationLine(bet)}</Fact>
      <Fact term="Check on">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <time dateTime={bet.check_date}>{formatDay(bet.check_date)}</time>
          {bet.status === "open" || bet.status === "proposed" ? (
            <span className="text-ink-3">({relativeDay(bet.check_date, today)})</span>
          ) : null}
        </span>
      </Fact>
      {bet.kind === "metric" && bet.baseline !== null && bet.baseline !== undefined ? (
        <Fact term="Where it was">{sizeLabel(bet.baseline, bet.unit) ?? "Not given"}</Fact>
      ) : null}
      <Fact term="Evidence from">{SOURCE_LABEL[bet.source]}</Fact>
      <Fact term="Type of decision">{CATEGORY_LABEL[bet.category]}</Fact>
      {bet.confidence_pct ? <Fact term="How sure">{bet.confidence_pct}% sure</Fact> : null}
      <Fact term="Owner">{bet.owner_name ?? "The meeting's host"}</Fact>
      {bet.team_name ? <Fact term="Team">{bet.team_name}</Fact> : null}
      {bet.assumption ? <Fact term="What has to be true">{bet.assumption}</Fact> : null}
      {due < 0 && bet.status === "open" ? <Fact term="Check">The check runs at 08:00 UTC; this one is next.</Fact> : null}
    </dl>
  );
}

function QuoteLine({ bet }: { bet: Bet }) {
  if (!bet.quote) return null;
  return (
    <figure className="flex gap-3 rounded-ctl border-l-0 bg-bg-2 px-3.5 py-3">
      <Quotes size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-signal-ink" />
      <div className="min-w-0">
        <blockquote className="font-display text-[16px]  leading-snug text-ink">{bet.quote}</blockquote>
        <figcaption className="mt-1 text-[13px] text-ink-3">
          {bet.quote_speaker_name ? `${bet.quote_speaker_name}, in the meeting` : "Said in the meeting"}
        </figcaption>
      </div>
    </figure>
  );
}

export function DecisionBet({
  initial,
  decisionId,
  meetingId,
  decisionContent,
  today,
}: {
  initial: DecisionBetView | null;
  decisionId: string;
  meetingId: string;
  decisionContent: string;
  today: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<DecisionBetView | null>(initial);
  const [mode, setMode] = useState<Mode>("view");
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const head = (right?: React.ReactNode) => (
    <CardHead
      id="bet-heading"
      title="What this decision bets on"
      caption="Checked on a date, scored by a person"
      right={right}
      divided
    />
  );

  if (!view) {
    return (
      <Card as="section" flush clip={false} id="bet" aria-labelledby="bet-heading">
        {head()}
        <ErrorState variant="inline" title="The expected outcome could not be loaded" onRetry={() => router.refresh()} className="pt-4" />
      </Card>
    );
  }

  const bet = view.bet;
  const done = (r: BetResult, ok: string, undo?: () => void) => {
    if (!r.ok) {
      setError({ field: r.field, message: r.message });
      notifyError(r.message);
      if (r.gone) router.refresh();
      return false;
    }
    setError(null);
    setView(r.view);
    setMode("view");
    notifySuccess(ok, undo ? { undo } : {});
    return true;
  };

  const run = (fn: () => Promise<BetResult>, ok: string, undo?: () => Promise<BetResult>, undone?: string) =>
    start(async () => {
      const r = await fn();
      done(r, ok, undo ? () => start(async () => void done(await undo(), undone ?? "Undone")) : undefined);
    });

  const save = (body: BetUpsert) => run(() => saveBet(decisionId, body, meetingId), bet ? "Expected outcome saved" : "Expected outcome added");
  const accept = () => run(() => stepBet(decisionId, "accept", meetingId), "Expectation kept");
  const dismiss = () =>
    run(
      () => stepBet(decisionId, "dismiss", meetingId),
      "Marked as not a bet",
      () => stepBet(decisionId, "restore", meetingId),
      "Expectation restored",
    );
  const restore = () => run(() => stepBet(decisionId, "restore", meetingId), "Expectation restored");
  const resolve = (input: { outcome: Outcome; assumption_held: boolean | null; lesson: string }) =>
    run(
      () => resolveBet(decisionId, input, meetingId),
      `Bet scored: ${OUTCOME_LABEL[input.outcome].toLowerCase()}`,
      () => stepBet(decisionId, "reopen", meetingId),
      "Score taken back",
    );
  const reopen = () => run(() => stepBet(decisionId, "reopen", meetingId), "Bet reopened");

  // --- editing ---------------------------------------------------------------------------------
  if (mode === "edit" && view.can_edit) {
    return (
      <Card as="section" flush clip={false} id="bet" aria-labelledby="bet-heading">
        {head()}
        <CardBody className="pt-5">
          <BetEditor
            view={view}
            decisionContent={decisionContent}
            today={today}
            saving={pending}
            onSave={save}
            onCancel={() => {
              setError(null);
              setMode("view");
            }}
            error={error}
          />
        </CardBody>
      </Card>
    );
  }

  // --- no bet ------------------------------------------------------------------------------------
  if (!bet) {
    return (
      <Card as="section" flush clip={false} id="bet" aria-labelledby="bet-heading">
        {head()}
        <CardBody className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col items-start gap-3">
            <EmptyArtwork art="decisions" className="h-12 w-[90px]" />
            <p className="display text-[20px] leading-tight text-ink-display">No expected outcome yet</p>
            <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-3">
              {view.can_edit
                ? "Say what this decision should achieve and when to check. On that date the evidence is gathered and you score it, so the workspace learns which calls it gets right."
                : "Its owner, the meeting's host or whoever confirmed it can say what it should achieve. When the meeting says so out loud, your Myte suggests it too."}
            </p>
            {view.can_edit ? (
              <Button onClick={() => setMode("edit")} className="mt-1">
                <Target size={17} aria-hidden />
                Add the expected outcome
              </Button>
            ) : null}
          </div>
          <BetLessons hints={view.hints} compact />
        </CardBody>
      </Card>
    );
  }

  // --- dismissed ---------------------------------------------------------------------------------
  if (bet.status === "dismissed") {
    return (
      <Card as="section" flush clip={false} id="bet" aria-labelledby="bet-heading">
        {head(view.can_edit ? (
          <Button variant="outline" size="sm" onClick={restore} disabled={pending}>
            <ArrowCounterClockwise size={15} aria-hidden />
            Restore
          </Button>
        ) : undefined)}
        <CardBody className="pt-4">
          <p className="text-[15px] text-ink-3">
            Marked as not a bet: <span className="text-ink-2 line-through decoration-ink-4">{bet.statement}</span>
          </p>
        </CardBody>
      </Card>
    );
  }

  const status = (
    bet.status === "resolved" && bet.outcome ? (
      <OutcomeChip outcome={bet.outcome} />
    ) : (
      <Chip tone={statusTone(bet.status)}>{STATUS_LABEL[bet.status]}</Chip>
    )
  );

  // --- suggested by the agent ----------------------------------------------------------------------
  if (bet.status === "proposed") {
    return (
      <Card as="section" flush clip={false} id="bet" aria-labelledby="bet-heading">
        {head(status)}
        <CardBody className="grid gap-5 pt-5">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-signal-soft text-signal-ink">
              <Sparkle size={18} weight="fill" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] text-ink-3">Your Myte heard an expected outcome in the meeting</p>
              <p className="display mt-1 text-[20px] leading-snug text-ink-display">{bet.statement}</p>
            </div>
          </div>
          <QuoteLine bet={bet} />
          <BetFacts bet={bet} today={today} />
          {view.can_edit ? (
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={accept} disabled={pending}>
                Keep this expectation
              </Button>
              <Button variant="outline" onClick={() => setMode("edit")} disabled={pending}>
                <PencilSimple size={16} aria-hidden />
                Edit first
              </Button>
              <Button variant="ghost" onClick={dismiss} disabled={pending}>
                Not a bet
              </Button>
            </div>
          ) : (
            <p className="text-[14px] text-ink-3">Waiting for {bet.owner_name ?? "its owner"} to keep, edit or dismiss it.</p>
          )}
          <p className="text-[13px] text-ink-3">Nothing is checked or scored until a person keeps it.</p>
        </CardBody>
      </Card>
    );
  }

  // --- scored ----------------------------------------------------------------------------------------
  if (bet.status === "resolved" && bet.outcome) {
    const Icon = OUTCOME_ICON[bet.outcome];
    if (mode === "resolve" && view.can_edit) {
      return (
        <Card as="section" flush clip={false} id="bet" aria-labelledby="bet-heading">
          {head(status)}
          <CardBody className="pt-5">
            <BetResolveForm bet={bet} saving={pending} error={error?.message ?? null} onResolve={resolve} onCancel={() => setMode("view")} />
          </CardBody>
        </Card>
      );
    }
    return (
      <Card as="section" flush clip={false} id="bet" aria-labelledby="bet-heading">
        {head(status)}
        <CardBody className="grid gap-5 pt-5">
          <div className="flex items-start gap-3.5">
            <Icon
              size={34}
              weight="fill"
              aria-hidden
              className={bet.outcome === "hit" ? "text-ok" : bet.outcome === "partly" ? "text-priority-medium" : "text-priority-high"}
            />
            <div className="min-w-0">
              <p className="display text-[20px] leading-snug text-ink-display">{bet.statement}</p>
              <p className="mt-1 text-[14px] text-ink-3">
                Scored {OUTCOME_LABEL[bet.outcome].toLowerCase()}
                {bet.resolved_by_name ? ` by ${bet.resolved_by_name}` : ""}
                {bet.resolved_at ? ` on ${formatDay(bet.resolved_at)}` : ""}
                {bet.assumption && bet.assumption_held === false ? ". The assumption did not hold." : ""}
                {bet.assumption && bet.assumption_held === true ? ". The assumption held." : ""}
              </p>
            </div>
          </div>
          {bet.lesson ? (
            <figure className="rounded-ctl bg-bg-2 px-4 py-3.5">
              <figcaption className="text-[12.5px] font-semibold text-ink-3">The lesson</figcaption>
              <p className="mt-1 font-display text-[17px]  leading-snug text-ink">{bet.lesson}</p>
            </figure>
          ) : null}
          <BetFacts bet={bet} today={today} />
          {(bet.evidence ?? []).length ? (
            <details className="group">
              <summary className="cursor-pointer text-[14px] font-semibold text-ink-2 hover:text-ink">
                The evidence ({(bet.evidence ?? []).length})
              </summary>
              <div className="mt-3">
                <BetEvidenceList evidence={bet.evidence ?? []} />
              </div>
            </details>
          ) : null}
          {view.can_edit ? (
            <div className="flex flex-wrap gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setMode("resolve")} disabled={pending}>
                <PencilSimple size={15} aria-hidden />
                Change the call
              </Button>
              <Button variant="ghost" size="sm" onClick={reopen} disabled={pending}>
                <ArrowCounterClockwise size={15} aria-hidden />
                Reopen
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>
    );
  }

  // --- waiting, or ready to score ----------------------------------------------------------------
  const ready = bet.status === "due";
  return (
    <Card as="section" flush clip={false} id="bet" aria-labelledby="bet-heading">
      {head(status)}
      <CardBody className="grid gap-5 pt-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${ready ? "bg-priority-medium-soft text-priority-medium" : "bg-priority-low-soft text-priority-low"}`}
          >
            {ready ? <CalendarCheck size={18} weight="fill" /> : <ClockCountdown size={18} weight="fill" />}
          </span>
          <div className="min-w-0">
            <p className="display text-[20px] leading-snug text-ink-display">{bet.statement}</p>
            <p className="mt-1 text-[14px] text-ink-3">
              {ready
                ? `The check date came on ${formatDay(bet.check_date)}. ${view.can_edit ? "The evidence is below; make the call." : "Waiting for its owner to score it."}`
                : `Checked ${relativeDay(bet.check_date, today)}, on ${formatDay(bet.check_date)}.`}
            </p>
          </div>
        </div>
        <QuoteLine bet={bet} />
        <BetFacts bet={bet} today={today} />

        {ready ? (
          <section aria-labelledby="bet-evidence-heading" className="grid gap-3">
            <h3 id="bet-evidence-heading" className="text-[15px] font-semibold text-ink">
              What the check found
            </h3>
            {bet.suggested_outcome ? (
              <p className="rounded-ctl bg-bg-2 px-3.5 py-2.5 text-[14px] text-ink-2">
                The connected numbers suggest <strong className="font-semibold">{OUTCOME_LABEL[bet.suggested_outcome].toLowerCase()}</strong>
                {bet.suggested_reason ? `: ${bet.suggested_reason}` : ""}. It is only a suggestion.
              </p>
            ) : null}
            <BetEvidenceList evidence={bet.evidence ?? []} />
          </section>
        ) : null}

        {view.can_edit && (ready || mode === "resolve") ? (
          <div className="rounded-ctl border border-line p-4">
            <BetResolveForm
              bet={bet}
              saving={pending}
              error={error?.message ?? null}
              onResolve={resolve}
              onCancel={ready ? undefined : () => setMode("view")}
            />
          </div>
        ) : null}

        {view.can_edit && mode === "view" ? (
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setMode("edit")} disabled={pending}>
              <PencilSimple size={15} aria-hidden />
              Edit
            </Button>
            {!ready ? (
              <Button variant="outline" size="sm" onClick={() => setMode("resolve")} disabled={pending}>
                Score it now
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={dismiss} disabled={pending}>
              Not a bet
            </Button>
          </div>
        ) : null}
        {!ready ? <BetLessons hints={view.hints} compact /> : null}
      </CardBody>
    </Card>
  );
}
