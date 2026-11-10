import type { CSSProperties } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Scales } from "@phosphor-icons/react/dist/ssr";
import type { DashboardDecision } from "@/lib/api/types";
import { CardHead, EmptyBlock, ErrorBlock, TextLink } from "./parts";
import { formatShortDate } from "./format";

/** Confirmed decisions from meetings you were in, newest first: `/bff/dashboard` `decisions`.
 *  Each row opens its lineage, the FOLLOWS_FROM chain the knowledge graph keeps. */
export function RecentDecisions({
  decisions,
  failed,
  className,
  style,
}: {
  decisions: DashboardDecision[];
  failed: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Card role="region" aria-labelledby="decisions-title" className={`p-0 ${className ?? ""}`} style={style}>
      <CardHead
        id="decisions-title"
        title="Recent decisions"
        right={<TextLink href="/decisions">Decision log</TextLink>}
      />
      {failed ? (
        <ErrorBlock title="We could not load decisions" text="Confirmed decisions are safe. Try again in a moment." />
      ) : decisions.length > 0 ? (
        <ul className="divide-y divide-line pb-2">
          {decisions.map((decision) => (
            <li key={decision.id}>
              <Link
                href={`/meetings/${decision.meeting_id}/decisions/${decision.id}`}
                className="block min-h-[44px] px-[18px] py-[13px] transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3 sm:px-[22px]"
              >
                <span className="block text-[14px] font-semibold leading-snug text-ink">{decision.content}</span>
                {decision.rationale ? (
                  <span className="mt-1 line-clamp-2 block text-[13px] text-ink-3">{decision.rationale}</span>
                ) : null}
                <span className="mt-2 block text-[12.5px] text-ink-3">
                  {decision.meeting_title ?? "Untitled meeting"}, {formatShortDate(decision.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyBlock
          icon={<Scales size={24} aria-hidden />}
          title="No decisions yet"
          text="Decisions confirmed in your meetings go on the record here."
        />
      )}
    </Card>
  );
}
