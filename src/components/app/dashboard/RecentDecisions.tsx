import type { CSSProperties } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Scales } from "@phosphor-icons/react/dist/ssr";
import { mockDecisions } from "@/lib/mock/data";
import { CardHead, Chip, EmptyBlock, TextLink } from "./parts";
import { formatShortDate, priorityLabel } from "./format";

/** Confirmed decisions with their source meeting: the record the agents keep. */
export function RecentDecisions({ className, style }: { className?: string; style?: CSSProperties }) {
  const recent = [...mockDecisions]
    .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt))
    .slice(0, 3);

  return (
    <Card role="region" aria-labelledby="decisions-title" className={`p-0 ${className ?? ""}`} style={style}>
      <CardHead
        id="decisions-title"
        title="Recent decisions"
        right={<TextLink href="/decisions">Decision log</TextLink>}
      />
      {recent.length > 0 ? (
        <ul className="divide-y divide-line pb-2">
          {recent.map((decision) => (
            <li key={decision.id}>
              <Link
                href="/decisions"
                className="block min-h-[44px] px-[18px] py-[13px] transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3 sm:px-[22px]"
              >
                <span className="block text-[14px] font-semibold leading-snug text-ink">
                  {decision.title}
                </span>
                <span className="mt-1 line-clamp-2 block text-[13px] text-ink-3">
                  {decision.summary}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-ink-3">
                  <Chip tone={decision.priority}>{priorityLabel[decision.priority]}</Chip>
                  <span className="min-w-0">
                    {decision.meetingTitle}, {formatShortDate(decision.confirmedAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyBlock
          icon={<Scales size={24} aria-hidden />}
          title="No decisions yet"
          text="Decisions you confirm in meetings go on the record here."
        />
      )}
    </Card>
  );
}
