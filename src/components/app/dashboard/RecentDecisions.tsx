import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockDecisions } from "@/lib/mock/data";
import { formatShortDate } from "./format";

/* Confirmed decisions with their meeting source — the record the agents keep.
   Uses the frozen priority-strip card language from the decisions screen. */
export function RecentDecisions({ className = "" }: { className?: string }) {
  const recent = [...mockDecisions]
    .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt))
    .slice(0, 3);

  return (
    <section aria-labelledby="recent-decisions-heading" className={`min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2
          id="recent-decisions-heading"
          className="text-[17px] font-medium text-ink-display"
        >
          Recent decisions
        </h2>
        <Link
          href="/decisions"
          className="link-underline flex min-h-[40px] shrink-0 items-center text-[13px] font-medium text-ink-2"
        >
          View all
        </Link>
      </div>

      {recent.length > 0 ? (
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-3">
          {recent.map((decision) => (
            <Link key={decision.id} href="/decisions" className="block min-w-0 rounded-card">
              <Card
                priorityStrip={decision.priority}
                className="h-full transition-[border-color,box-shadow] duration-200 hover:border-line-2 hover:shadow-[0_12px_32px_-24px_rgba(40,30,20,0.4)]"
              >
                <p className="text-[14.5px] font-medium leading-snug text-ink">
                  {decision.title}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-3">
                  {decision.summary}
                </p>
                <p className="mt-3 truncate font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                  {decision.meetingTitle} · {formatShortDate(decision.confirmedAt)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          <EmptyState
            title="No decisions yet"
            description="Decisions you confirm in meetings go on the record here."
          />
        </div>
      )}
    </section>
  );
}
