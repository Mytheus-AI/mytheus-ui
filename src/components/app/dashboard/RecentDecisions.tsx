import Link from "next/link";
import type { DashboardDecision } from "@/lib/api/types";
import { CardHead, cardClass } from "@/components/ui/Card";
import { TextLink } from "@/components/ui/TextLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatShortDate } from "./format";

/** Confirmed decisions from meetings you were in, newest first: `/bff/dashboard` `decisions`.
 *  Each row opens its lineage, the FOLLOWS_FROM chain the knowledge graph keeps. */
export function RecentDecisions({
  decisions,
  failed,
  className = "",
}: {
  decisions: DashboardDecision[];
  failed: boolean;
  className?: string;
}) {
  return (
    <section aria-labelledby="decisions-title" className={cardClass({ flush: true, className })}>
      <CardHead id="decisions-title" title="Recent decisions" right={<TextLink href="/decisions">Decision log</TextLink>} />
      {failed ? (
        <ErrorState variant="inline" title="We could not load decisions" text="Confirmed decisions are safe. Try again in a moment." />
      ) : decisions.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line pb-1">
          {decisions.map((decision) => (
            <li key={decision.id}>
              <Link
                href={`/meetings/${decision.meeting_id}/decisions/${decision.id}`}
                className="block min-h-[44px] px-[18px] py-[13px] transition-colors duration-150 hover:bg-surface-2 active:bg-bg-2 sm:px-[22px]"
              >
                <span className="block text-[14px] font-semibold leading-snug text-ink">{decision.content}</span>
                {decision.rationale ? (
                  <span className="mt-1 line-clamp-2 block text-[14px] text-ink-3">{decision.rationale}</span>
                ) : null}
                <span className="mt-1.5 block text-[12.5px] text-ink-3">
                  {decision.meeting_title ?? "Untitled meeting"}, {formatShortDate(decision.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState inCard art="decisions" title="No decisions yet" description="Decisions confirmed in your meetings go on the record here." />
      )}
    </section>
  );
}
