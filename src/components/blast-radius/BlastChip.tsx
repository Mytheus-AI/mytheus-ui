"use client";

import { useEffect, useReducer } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Waves } from "@phosphor-icons/react";
import { chipLine } from "@/lib/blast-radius";
import { isUuid } from "@/lib/decision-why";
import { snapshot, watchDecision } from "./meeting-blast-store";

/* The one-line blast radius under a confirmed decision, in the room and on the meeting's after
   page: "Changes 3 tasks, moves 1 goal, clashes with 1 decision from Sales". While the agent is
   still working it out the line says so quietly; it links to the decision's map. It reads from one
   shared poller per meeting (see meeting-blast-store), so a list of decisions costs one request
   every 5 s at most, for a minute. When nothing can be read it shows nothing: the decision card is
   complete without it. */

const MEETING_IN_PATH = /\/meetings\/([0-9a-f-]{36})(?:\/|$)/i;

export function BlastChip({ decisionId, meetingId }: { decisionId: string; meetingId?: string }) {
  const pathname = usePathname();
  const mid = meetingId ?? pathname?.match(MEETING_IN_PATH)?.[1] ?? null;
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!mid || !isUuid(mid) || !isUuid(decisionId)) return;
    return watchDecision(mid, decisionId, bump);
  }, [mid, decisionId]);

  if (!mid || !isUuid(mid) || !isUuid(decisionId)) return null;
  const { item, failed, done } = snapshot(mid, decisionId);
  if (!item) {
    if (failed || done) return null;
    return <Line text="Working out what this decision touches" pending href={null} />;
  }
  const line = chipLine(item);
  return <Line text={line.text} pending={line.pending} quiet={line.quiet} href={`/meetings/${mid}/decisions/${decisionId}#blast`} />;
}

function Line({ text, pending, quiet = true, href }: { text: string; pending: boolean; quiet?: boolean; href: string | null }) {
  const body = (
    <>
      <Waves size={14} weight="bold" aria-hidden className={`mt-[2px] shrink-0 ${pending ? "motion-safe:animate-pulse" : ""}`} />
      <span className="min-w-0">{text}</span>
    </>
  );
  const cls = `inline-flex max-w-full items-start gap-1.5 rounded-ctl px-2.5 py-[3px] text-left text-[12.5px] font-semibold leading-[1.45] ${
    quiet ? "bg-bg-2 text-ink-3" : "bg-signal-soft text-signal-ink"
  }`;
  if (!href || pending) {
    return (
      <span className="mt-1.5 flex min-w-0">
        <span className={cls} role={pending ? "status" : undefined}>
          {body}
        </span>
      </span>
    );
  }
  return (
    <span className="mt-1.5 flex min-w-0">
      <Link href={href} className={`${cls} underline-offset-4 hover:underline`} title="See the blast radius">
        {body}
        <span className="sr-only"> (see the blast radius)</span>
      </Link>
    </span>
  );
}
