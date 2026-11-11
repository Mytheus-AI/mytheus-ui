"use client";

import Link from "next/link";
import { ArrowUpRight, ChartLineUp, Kanban, Note as NoteIcon, Scales, VideoCamera, WarningCircle } from "@phosphor-icons/react";
import { Chip } from "@/components/ui/Chip";
import type { BetEvidence as Evidence } from "@/lib/api/bets-types";
import { formatDay } from "@/lib/bets";

/* What the check found for a bet: a CRM or metric reading, the meeting's Jira outcomes, later
   decisions and meetings that mention it, the decision that replaced it. Gathered by the daily
   check, never a verdict: the signal chip only says which way a piece leans. A meeting or
   decision from a meeting you were not in keeps its place with its words withheld. */

const ICON = { metric: ChartLineUp, jira: Kanban, decision: Scales, meeting: VideoCamera, note: NoteIcon } as const;
const KIND = { metric: "Number", jira: "Jira", decision: "Later decision", meeting: "Later meeting", note: "Note" } as const;

function href(e: Evidence): { href: string; external: boolean } | null {
  if (!e.visible) return null;
  if (e.kind === "jira" && e.url) return { href: e.url, external: true };
  if (e.decision_id && e.meeting_id) return { href: `/meetings/${e.meeting_id}/decisions/${e.decision_id}`, external: false };
  if (e.meeting_id) return { href: `/meetings/${e.meeting_id}`, external: false };
  return null;
}

export function BetEvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return <p className="text-[14px] text-ink-3">Nothing has been gathered yet. The check on the date collects it.</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-ctl border border-line">
      {evidence.map((e) => {
        const Icon = ICON[e.kind];
        const link = href(e);
        const body = (
          <>
            <span aria-hidden className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2">
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
                <span className="font-semibold">{KIND[e.kind]}</span>
                {e.meeting_title && e.visible ? <span className="truncate">{e.meeting_title}</span> : null}
                {e.occurred_at ? <time dateTime={e.occurred_at}>{formatDay(e.occurred_at)}</time> : null}
              </span>
              <span className={`mt-0.5 block text-[14.5px] leading-snug ${e.visible ? "text-ink" : "italic text-ink-3"}`}>{e.title}</span>
              {e.detail ? <span className="mt-1 block text-[14px] leading-relaxed text-ink-3">{e.detail}</span> : null}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {e.signal === "supports" ? <Chip tone="ok">Supports it</Chip> : null}
              {e.signal === "against" ? (
                <Chip icon={<WarningCircle size={13} weight="fill" className="text-priority-high" />}>Points against it</Chip>
              ) : null}
              {link ? <ArrowUpRight size={15} aria-hidden className="text-ink-3" /> : null}
            </span>
          </>
        );
        return (
          <li key={e.id}>
            {link ? (
              link.external ? (
                <a href={link.href} target="_blank" rel="noreferrer" className="flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2">
                  {body}
                  <span className="sr-only">(opens Jira in a new tab)</span>
                </a>
              ) : (
                <Link href={link.href} className="flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2">
                  {body}
                </Link>
              )
            ) : (
              <div className="flex items-start gap-3 px-3.5 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
