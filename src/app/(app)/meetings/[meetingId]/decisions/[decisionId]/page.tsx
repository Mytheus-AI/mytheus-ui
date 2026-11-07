import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, CheckSquare, GitCommit, Scales } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Note, SectionCard } from "@/components/settings/primitives";
import { mockActions, mockDecisions, mockMeetings } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Decision lineage | Mytheus" };

/* Decision lineage (Plan 7-9 section 3.8): the FOLLOWS_FROM chain behind one confirmed
   decision, oldest first, ending at this one. Later it reads the `decision lineage` template
   through `bff` -> `knowledge-graph-service`; today it renders the mock chain. */

export function generateStaticParams() {
  return mockDecisions.map((d) => ({ meetingId: d.meetingId, decisionId: d.id }));
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const priorityTone = { high: "high", medium: "medium", low: "low" } as const;

export default function DecisionLineagePage({
  params,
}: {
  params: { meetingId: string; decisionId: string };
}) {
  const decision = mockDecisions.find((d) => d.id === params.decisionId && d.meetingId === params.meetingId);
  if (!decision) notFound();

  const meeting = mockMeetings.find((m) => m.id === decision.meetingId);
  const chain = decision.lineage && decision.lineage.length ? decision.lineage : [decision.meetingTitle];
  const earlier = chain.slice(0, -1);
  const actions = mockActions.filter((a) => a.meetingId === decision.meetingId);
  const siblings = mockDecisions.filter((d) => d.meetingId === decision.meetingId && d.id !== decision.id);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <Link
        href={`/meetings/${decision.meetingId}#decisions`}
        className="inline-flex items-center gap-1.5 self-start rounded-md text-[13px] font-semibold text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden />
        {decision.meetingTitle}
      </Link>

      <header className="rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="success">
            <CheckCircle size={14} weight="fill" className="mr-1.5" aria-hidden />
            Confirmed {dateTime.format(new Date(decision.confirmedAt))}
          </Badge>
          <Badge tone={priorityTone[decision.priority]} className="capitalize">
            {decision.priority} priority
          </Badge>
        </div>
        <h1 className="display max-w-[30ch] text-balance text-[clamp(1.8rem,3.2vw,2.4rem)] text-ink-display">
          {decision.title}
        </h1>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">{decision.summary}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <SectionCard
          title="Lineage"
          description={
            earlier.length
              ? `Follows from ${earlier.length} earlier ${earlier.length === 1 ? "meeting" : "meetings"}, oldest first.`
              : "No earlier meetings feed into this decision. It starts its own thread."
          }
        >
          <ol className="relative px-4 py-5 sm:px-[22px]">
            {chain.map((title, i) => {
              const current = i === chain.length - 1;
              return (
                <li key={`${title}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* the FOLLOWS_FROM edge to the next node */}
                  {!current ? (
                    <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-line-2" />
                  ) : null}
                  <span
                    aria-hidden
                    className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      current ? "bg-signal text-white shadow-[0_0_0_5px_var(--signal-soft)]" : "border border-line-2 bg-surface text-ink-3"
                    }`}
                  >
                    {current ? <Scales size={16} weight="fill" /> : <GitCommit size={16} />}
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className={`text-[14.5px] ${current ? "font-semibold text-ink" : "font-medium text-ink-2"}`}>{title}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {current
                        ? `This decision · ${shortDate.format(new Date(decision.confirmedAt))}`
                        : i === 0
                          ? "Where the thread started"
                          : "Earlier context, carried forward"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </SectionCard>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Actions from this meeting">
            {actions.length ? (
              actions.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-[22px]">
                  <CheckSquare
                    size={18}
                    weight={a.status === "done" ? "fill" : "regular"}
                    className={`mt-0.5 shrink-0 ${a.status === "done" ? "text-signal-deep" : "text-ink-3"}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className={`text-[14px] font-medium ${a.status === "done" ? "text-ink-3 line-through" : "text-ink"}`}>{a.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {a.assignee} &middot; due {shortDate.format(new Date(a.dueDate))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">No action items came out of this meeting.</p>
            )}
          </SectionCard>

          {siblings.length ? (
            <SectionCard title="Also decided in this meeting">
              {siblings.map((d) => (
                <Link
                  key={d.id}
                  href={`/meetings/${d.meetingId}/decisions/${d.id}`}
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg sm:px-[22px]"
                >
                  <span className="min-w-0 flex-1 text-[14px] font-medium text-ink">{d.title}</span>
                  <ArrowRight size={15} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              ))}
            </SectionCard>
          ) : null}

          <Note>Only confirmed decisions appear in a lineage. Nothing your agent proposed is saved until someone confirms it.</Note>

          {meeting ? (
            <LinkButton href={`/meetings/${meeting.id}`} variant="outline" className="self-start">
              Open meeting
            </LinkButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
