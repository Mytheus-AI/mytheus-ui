import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockDecisions } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Decisions — Mytheus" };

/* Decision history: everything the org has confirmed, newest first, each
   carrying its FOLLOWS_FROM lineage so you can trace how a decision evolved
   across meetings. Only confirmed decisions exist here — dismissed detections
   never reach this record. */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function DecisionsPage() {
  const decisions = [...mockDecisions].sort(
    (a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime(),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <p className="kicker text-signal">Decisions</p>
      <h1 className="display mt-2 text-[clamp(1.8rem,4vw,2.4rem)]">
        Everything the org decided.
      </h1>
      <p className="mt-2 max-w-[60ch] text-[14px] text-ink-3">
        Every decision here was confirmed by a person in the room. The lineage
        trail shows what a decision followed from, meeting by meeting.
      </p>

      {decisions.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No decisions yet"
          description="Decisions confirmed in meetings will build the org's history here."
        />
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {decisions.map((d) => (
            <Card key={d.id} priorityStrip={d.priority}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-medium text-ink">{d.title}</p>
                  <p className="mt-1 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-3">
                    {d.summary}
                  </p>
                </div>
                <Badge tone={d.priority} className="capitalize">
                  {d.priority}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  href={`/meetings/${d.meetingId}`}
                  className="link-underline text-[12.5px] font-medium text-ink-2"
                >
                  {d.meetingTitle}
                </Link>
                <span className="font-mono text-[11px] tabular-nums text-ink-3">
                  Confirmed {dateFormatter.format(new Date(d.confirmedAt))}
                </span>

                {/* the FOLLOWS_FROM chain */}
                {d.lineage && (
                  <span className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-bg-2 px-3 py-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">
                      Follows from
                    </span>
                    {d.lineage.map((m, i) => (
                      <span key={m} className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2">
                        {i > 0 && <span aria-hidden className="text-ink-3">→</span>}
                        {m}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
