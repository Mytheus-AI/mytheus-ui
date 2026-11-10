import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle, ClockCounterClockwise, GitCommit, Scales, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { Chip } from "@/components/ui/Chip";
import { LinkButton } from "@/components/ui/Button";
import { Note } from "@/components/ui/Note";
import { SectionCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Page, PageColumns, PageHead } from "@/components/ui/Page";
import { Crumb } from "@/components/app/Crumb";
import { fetchDecisionLineage, type LineageDecision } from "@/lib/api/lineage";

export const metadata: Metadata = { title: "Decision lineage | Mytheus" };

/* Decision lineage (Plan 7-9 section 3.8 step 3): the FOLLOWS_FROM chain around one confirmed
   decision, oldest first. What it superseded comes before it, what superseded it comes after.
   Read from `bff` -> `knowledge-graph-service`'s `decision_lineage` template, which only ever
   holds confirmed decisions. With no gateway configured the page says history is unavailable
   rather than showing a sample. The topbar breadcrumb reads Decisions / the decision. */

type ChainNode = {
  id: string;
  meetingId: string | null;
  content: string | null;
  status: string | null;
  confirmedAt: string | null;
  role: "ancestor" | "subject" | "descendant";
};

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function fromLive(d: LineageDecision): ChainNode {
  return {
    id: d.id,
    meetingId: d.meeting_id ?? null,
    content: d.content ?? null,
    status: d.status ?? null,
    confirmedAt: d.confirmed_at ?? null,
    role: d.role,
  };
}

function clip(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function caption(node: ChainNode, index: number): string {
  if (node.role === "subject") return "This decision";
  if (node.role === "descendant") return "Replaced this decision";
  return index === 0 ? "Where the thread started" : "Superseded by the next decision";
}

async function loadChain(meetingId: string, decisionId: string): Promise<ChainNode[] | "unavailable"> {
  if (!process.env.API_GATEWAY_URL && !process.env.NEXT_PUBLIC_API_GATEWAY_URL) return "unavailable";
  const result = await fetchDecisionLineage(meetingId, decisionId);
  if (result.kind === "not-found") notFound();
  if (result.kind === "unavailable") return "unavailable";
  return result.lineage.chain.map(fromLive);
}

export default async function DecisionLineagePage({
  params,
}: {
  params: { meetingId: string; decisionId: string };
}) {
  const chain = await loadChain(params.meetingId, params.decisionId);
  const openMeeting = (
    <LinkButton href={`/meetings/${params.meetingId}`} variant="outline">
      <VideoCamera size={16} aria-hidden />
      Open meeting
    </LinkButton>
  );

  if (chain === "unavailable") {
    return (
      <Page>
        <Crumb label="Decision" />
        <PageHead title="Decision lineage" action={openMeeting} />
        <ErrorState
          title="Decision history is unavailable"
          text="We could not reach the knowledge graph just now. The decision itself is safe. Try again in a moment."
        />
      </Page>
    );
  }

  const subject = chain.find((n) => n.role === "subject");
  if (!subject) notFound();
  const earlier = chain.filter((n) => n.role === "ancestor").length;
  const later = chain.filter((n) => n.role === "descendant").length;
  const superseded = subject.status === "superseded";
  const title = subject.content ?? "Confirmed decision";

  return (
    <Page>
      <Crumb label={clip(title)} icon="decision" />
      <PageHead
        title={title}
        action={openMeeting}
        context={
          superseded ? (
            <Chip tone="medium" icon={<ClockCounterClockwise size={14} weight="bold" />}>
              Superseded
            </Chip>
          ) : (
            <Chip tone="ok" icon={<CheckCircle size={14} weight="fill" />}>
              Confirmed{subject.confirmedAt ? ` ${dateTime.format(new Date(subject.confirmedAt))} UTC` : ""}
            </Chip>
          )
        }
      />

      <PageColumns
        sticky={false}
        aside={
          <Note>Only confirmed decisions appear in a lineage. Nothing your agent proposed is saved until someone confirms it.</Note>
        }
      >
        <SectionCard
          title="Lineage"
          description={
            earlier || later
              ? [
                  earlier ? `Replaces ${earlier} earlier ${earlier === 1 ? "decision" : "decisions"}` : null,
                  later ? `replaced by ${later} later ${later === 1 ? "one" : "ones"}` : null,
                ]
                  .filter(Boolean)
                  .join(", ")
                  .replace(/^./, (c) => c.toUpperCase()) + ". Oldest first."
              : "Nothing came before this decision and nothing has replaced it."
          }
        >
          {/* The FOLLOWS_FROM chain as one straight coral thread with a bead per decision: the
              line's meaning in the product, this carried forward. */}
          <ol className="relative px-4 py-5 sm:px-[22px]">
            {chain.length > 1 ? (
              <span
                aria-hidden
                className="absolute bottom-9 left-[31px] top-9 w-[2px] rounded-full bg-[var(--signal-line)] sm:left-[37px]"
              />
            ) : null}
            {chain.map((node, i) => {
              const current = node.role === "subject";
              const body = (
                <>
                  <p className={`text-[15px] leading-snug ${current ? "font-semibold text-ink" : "font-medium text-ink-2"}`}>
                    {node.content ?? "An earlier decision"}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    {caption(node, i)}
                    {node.confirmedAt ? `, ${shortDate.format(new Date(node.confirmedAt))}` : ""}
                  </p>
                </>
              );
              return (
                <li key={node.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <span
                    aria-hidden
                    className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      current
                        ? "bg-signal text-pill-on shadow-[0_0_0_5px_var(--signal-soft)]"
                        : "border-2 border-[var(--signal-line)] bg-surface text-signal-ink"
                    }`}
                  >
                    {current ? <Scales size={16} weight="fill" /> : <GitCommit size={16} />}
                  </span>
                  <div className="min-w-0 pt-1">
                    {!current && node.meetingId ? (
                      <Link
                        href={`/meetings/${node.meetingId}/decisions/${node.id}`}
                        className="group inline-flex flex-col rounded-ctl hover:text-ink"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div aria-current={current ? "step" : undefined}>{body}</div>
                    )}
                  </div>
                  {!current && node.meetingId ? (
                    <ArrowRight size={16} className="mt-2 shrink-0 text-ink-3" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </SectionCard>
      </PageColumns>
    </Page>
  );
}
