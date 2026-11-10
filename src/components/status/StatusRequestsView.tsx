"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHead } from "@/components/app/PageHead";
import type { StatusRequestView } from "@/lib/api/personal-types";
import { Count, Explainer, PanelHead, panelClass } from "@/components/promises/parts";
import { AnsweredRow } from "./AnsweredRow";
import { StatusAnswerRow } from "./StatusAnswerRow";
import { useStatusAnswers } from "./useStatusAnswers";

/* /status-requests (ADR-0039 B7, Part E): "how is it going?" for each open action you own, asked
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

  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <PageHead
        title="Status requests"
        liveContext
        context={
          waiting === 0
            ? "Nothing waiting on you. Your agent asks here before a meeting follows up on something you own."
            : `${waiting} waiting on you. One line each is enough.`
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="pending-h" className={panelClass}>
            <PanelHead
              id="pending-h"
              title="Waiting on you"
              caption="Before your next meetings"
              right={waiting ? <Count n={waiting} label="waiting" /> : undefined}
            />
            {waiting === 0 ? (
              s.sentCount > 0 ? (
                <div className="flex items-center gap-3.5 border-t border-line px-[22px] py-6">
                  <CheckCircle size={26} weight="fill" aria-hidden className="shrink-0 text-ok" />
                  <p className="text-[15px] text-ink-2">All answered. Your updates will be in front of the room.</p>
                </div>
              ) : (
                <div className="border-t border-line">
                  <EmptyState
                    title="Nothing to answer"
                    description="An hour before a follow-up meeting, your agent asks here how your actions from the last one are going."
                    className="!rounded-none !border-0 !bg-transparent !py-12"
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
          </section>

          <section aria-labelledby="answered-h" className={panelClass}>
            <PanelHead
              id="answered-h"
              title="Answered"
              right={s.done.length ? <Count n={s.done.length} label="answered" /> : undefined}
            />
            {answeredFailed && s.done.length === 0 ? (
              <p className="px-[18px] pb-5 text-[14px] text-ink-3 sm:px-[22px]">
                Your earlier answers could not be loaded just now. Refresh to try again.
              </p>
            ) : s.done.length === 0 ? (
              <p className="px-[18px] pb-5 text-[14px] text-ink-3 sm:px-[22px]">Your answers will be listed here.</p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {s.done.map((r) => (
                  <AnsweredRow key={r.id} req={r} nowIso={nowIso} sending={!!s.saving[r.id]} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-2">
          <Explainer id="how-h" title="How this works">
            <ol className="space-y-3">
              {[
                "An hour before a meeting that follows up an earlier one, your agent asks about each open action you own from it.",
                "Pick on track, blocked or done, and add a line if it helps.",
                "Your answer is shown with the action in the meeting, so nobody has to ask in the room.",
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className="display w-5 shrink-0 text-[20px] leading-6 text-signal-ink">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <p className="pt-1 text-ink-3">A request you leave unanswered expires, and the meeting goes ahead without an update.</p>
          </Explainer>
        </aside>
      </div>
    </div>
  );
}
