import Link from "next/link";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { Chip } from "@/components/ui/Chip";
import { LocalStamp } from "@/components/digest/LocalStamp";
import type { ReversalDecision } from "@/lib/api/only-mytheus-types";
import { decisionHref } from "@/lib/reversals";
import { reopenedLine } from "@/lib/settlements";

/* A reversal of kind "reopened" (a4 contract 3c): the same decision, reopened because a reason
   for it broke. One line instead of Was / Now, linking to the decision's reasons. */
export function ReopenedLine({ d }: { d: ReversalDecision }) {
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-3">
        <Chip tone="medium" icon={<ArrowCounterClockwise size={13} weight="bold" />}>
          Reopened
        </Chip>
        <span className="min-w-0 truncate font-normal">
          {d.meeting_title ? `${d.meeting_title}, ` : ""}
          <LocalStamp iso={d.decided_at} mode="day" />
        </span>
      </p>
      <Link
        href={`${decisionHref(d)}#why`}
        className="mt-1.5 block max-w-[60ch] rounded-ctl text-[15px] font-semibold leading-snug text-ink underline-offset-4 hover:underline"
      >
        {reopenedLine(d.content)}
        <span className="sr-only"> (see why)</span>
      </Link>
    </div>
  );
}
