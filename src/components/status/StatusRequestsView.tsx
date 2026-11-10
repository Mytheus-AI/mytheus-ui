"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card, CardHead, Explainer } from "@/components/ui/Card";
import { Count } from "@/components/ui/Chip";
import { PageColumns, SectionBar } from "@/components/ui/Page";
import type { StatusRequestView } from "@/lib/api/personal-types";
import { AnsweredRow } from "./AnsweredRow";
import { StatusAnswerRow } from "./StatusAnswerRow";
import { useStatusAnswers } from "./useStatusAnswers";

/* My work, Updates I owe tab (status requests, ADR-0039 B7, Part E): "how is it going?" for each open action you own, asked
   an hour before the meeting that follows it up. Answer each in one line; answered ones are listed
   below. The side column says what happens to the answer. */
export function StatusRequestsView({
  pending,
  answered,
  answeredFailed,
  nowIso,
}: {
  pending: StatusRequestView[];
  answered: StatusRequestView[];
  answeredFailed: boolean;
  nowIso: string;
}) {
  const s = useStatusAnswers(pending, answered);
  const waiting = s.open.length;
  const aside = (
    <Explainer id="how-h" title="How this works">
      <ol className="space-y-3">
        {[
          "An hour before a meeting that follows up an earlier one, your agent asks about each open action you own from it.",
          "Pick on track, blocked or done, and add a line if it helps.",
          "Your answer is shown with the action in the meeting, so nobody has to ask in the room.",
        ].map((t, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="display w-5 shrink-0 text-[22px] leading-6 text-signal-ink">
              {i + 1}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      <p className="pt-1 text-ink-3">A request you leave unanswered expires, and the meeting goes ahead without an update.</p>
    </Explainer>
  );

  return (
    <div>
      <SectionBar
        liveContext
        context={
          waiting === 0
            ? "Nothing waiting on you. Your agent asks here before a meeting follows up on something you own."
            : `${waiting} waiting on you. One line each is enough.`
        }
      />

      <PageColumns aside={aside} asideLabel="How this works">
        <Card as="section" flush aria-labelledby="pending-h">
          <CardHead
            id="pending-h"
            title="Waiting on you"
            caption="Before your next meetings"
            right={waiting ? <Count n={waiting} label="waiting" /> : undefined}
          />
          {waiting === 0 ? (
            s.sentCount > 0 ? (
              <div role="status" className="flex items-center gap-3.5 border-t border-line px-4 py-6 sm:px-[22px]">
                <CheckCircle size={26} weight="fill" aria-hidden className="shrink-0 text-ok" />
                <p className="text-[15px] text-ink-2">All answered. Your updates will be in front of the room.</p>
              </div>
            ) : (
              <div className="border-t border-line">
                <EmptyState
                  inCard
                  art="updates"
                  title="Nothing to answer"
                  description="An hour before a follow-up meeting, your agent asks here how your actions from the last one are going."
                />
              </div>
            )
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {s.open.map((r) => (
                <StatusAnswerRow
                  key={r.id}
                  req={r}
                  wide
                  nowIso={nowIso}
                  draft={s.draftOf(r.id)}
                  error={s.errors[r.id]}
                  saving={!!s.saving[r.id]}
                  onDraft={(next) => s.setDraft(r.id, next)}
                  onSubmit={() => void s.submit(r)}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card as="section" flush aria-labelledby="answered-h">
          <CardHead
            id="answered-h"
            title="Answered"
            right={s.done.length ? <Count n={s.done.length} label="answered" /> : undefined}
          />
          {answeredFailed && s.done.length === 0 ? (
            <ErrorState variant="inline" title="Your earlier answers could not be loaded" text="New answers still send. Try again in a moment." />
          ) : s.done.length === 0 ? (
            <p className="px-4 pb-5 text-[14px] text-ink-3 sm:px-[22px]">Your answers will be listed here.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {s.done.map((r) => (
                <AnsweredRow key={r.id} req={r} nowIso={nowIso} sending={!!s.saving[r.id]} />
              ))}
            </ul>
          )}
        </Card>
      </PageColumns>
    </div>
  );
}
