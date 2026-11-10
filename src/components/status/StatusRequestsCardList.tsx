"use client";

import { CheckCircle } from "@phosphor-icons/react";
import type { StatusRequestView } from "@/lib/api/personal-types";
import { Count, PanelHead, PanelLink, panelClass } from "@/components/promises/parts";
import { StatusAnswerRow } from "./StatusAnswerRow";
import { useStatusAnswers } from "./useStatusAnswers";

const SHOWN = 3;

/* The card's client half: up to three requests, each answered in place. When the last one is
   sent the card says so instead of vanishing under the pointer. */
export function StatusRequestsCardList({
  initial,
  nowIso,
  className = "",
}: {
  initial: StatusRequestView[];
  nowIso: string;
  className?: string;
}) {
  const s = useStatusAnswers(initial);
  const shown = s.open.slice(0, SHOWN);
  const more = s.open.length - shown.length;

  return (
    <section aria-labelledby="status-card-h" className={`${panelClass} ${className}`}>
      <PanelHead
        id="status-card-h"
        title="Quick status before your meetings"
        caption="One line each, carried into the meeting"
        right={s.open.length ? <Count n={s.open.length} label="waiting" /> : undefined}
      />
      {shown.length === 0 ? (
        <div role="status" className="flex items-center gap-3 border-t border-line px-[18px] py-5 sm:px-[22px]">
          <CheckCircle size={22} weight="fill" aria-hidden className="shrink-0 text-ok" />
          <p className="text-[14.5px] text-ink-2">All answered. Your updates will be in front of the room.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {shown.map((r) => (
            <StatusAnswerRow
              key={r.id}
              req={r}
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
      <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-line px-[18px] py-1.5 sm:px-[22px]">
        <PanelLink href="/status-requests">All status requests</PanelLink>
        {more > 0 ? <span className="text-[12.5px] text-ink-3">{more} more waiting</span> : null}
      </div>
    </section>
  );
}
