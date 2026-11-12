"use client";

import Link from "next/link";
import { Lightbulb } from "@phosphor-icons/react";
import { OutcomeChip } from "./OutcomeChip";
import type { BetHints } from "@/lib/api/bets-types";
import { CATEGORY_LABEL, formatDay, pct } from "@/lib/bets";

/* "Calls like this one": what earlier, scored bets of the same kind taught, shown while a
   similar decision is being made. The record is the workspace's (no names); a lesson links to
   its decision only when you were in that meeting. */

export function BetLessons({ hints, compact = false }: { hints: BetHints | null; compact?: boolean }) {
  if (!hints || (!hints.record && (hints.lessons ?? []).length === 0)) return null;
  const rec = hints.record;
  return (
    <section aria-labelledby="bet-lessons-heading" className={`rounded-ctl bg-bg-2 ${compact ? "p-3.5" : "p-4"}`}>
      <h3 id="bet-lessons-heading" className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <Lightbulb size={16} weight="fill" aria-hidden className="text-signal-ink" />
        Calls like this one
      </h3>
      {rec ? (
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
          {CATEGORY_LABEL[rec.category]} calls in this workspace: {rec.hit} of {rec.resolved} hit
          {rec.partly ? `, ${rec.partly} partly` : ""}
          {rec.missed ? `, ${rec.missed} missed` : ""} ({pct(rec.hit_rate)} on balance).
        </p>
      ) : null}
      {(hints.lessons ?? []).length ? (
        <ul className="mt-3 space-y-2.5">
          {(hints.lessons ?? []).map((l, i) => (
            <li key={`${l.resolved_at}-${i}`} className="rounded-ctl bg-surface p-3 shadow-warm-1">
              <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
                <OutcomeChip outcome={l.outcome} />
                <span>{CATEGORY_LABEL[l.category]}</span>
                <time dateTime={l.resolved_at}>Scored {formatDay(l.resolved_at)}</time>
              </div>
              <p className="mt-1.5 text-[14px] text-ink-2">
                {l.decision_id ? (
                  <Link href={l.meeting_id ? `/meetings/${l.meeting_id}/decisions/${l.decision_id}` : "/decisions"} className="underline-offset-4 hover:underline">
                    {l.statement}
                  </Link>
                ) : (
                  l.statement
                )}
              </p>
              {l.lesson ? <p className="mt-1 font-display text-[15px]  leading-snug text-ink">{l.lesson}</p> : null}
              {l.failed_assumption ? (
                <p className="mt-1 text-[13.5px] text-ink-3">The assumption that failed: {l.failed_assumption}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
