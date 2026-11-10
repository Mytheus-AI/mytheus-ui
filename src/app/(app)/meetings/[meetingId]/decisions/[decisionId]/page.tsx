import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, ClockCounterClockwise, GitCommit, Scales } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Note, SectionCard } from "@/components/settings/primitives";
import { fetchDecisionLineage, type LineageDecision } from "@/lib/api/lineage";

export const metadata: Metadata = { title: "Decision lineage | Mytheus" };

/* Decision lineage (Plan 7-9 section 3.8 step 3): the FOLLOWS_FROM chain around one confirmed
   decision, oldest first. What it superseded comes before it, what superseded it comes after.
   Read from `bff` -> `knowledge-graph-service`'s `decision_lineage` template, which only ever
   holds confirmed decisions. With no gateway configured the page says history is unavailable
   rather than showing a sample. */

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
  const backLink = (
    <Link href={`/meetings/${params.meetingId}#decisions`} className="mx-back self-start">
      <ArrowLeft size={16} weight="bold" aria-hidden />
      Back to the meeting
    </Link>
  );

  if (chain === "unavailable") {
    return (
      <div className="mx-page flex max-w-5xl flex-col gap-6">
        {backLink}
        <div role="alert" className="rounded-card border border-line bg-surface px-6 py-12 text-center shadow-warm-1">
          <h1 className="font-display text-[22px] font-medium text-ink">Decision history is unavailable</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-3">
            We could not reach the knowledge graph just now. The decision itself is safe. Try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  const subject = chain.find((n) => n.role === "subject");
  if (!subject) notFound();
  const earlier = chain.filter((n) => n.role === "ancestor").length;
  const later = chain.filter((n) => n.role === "descendant").length;
  const superseded = subject.status === "superseded";

  return (
    <div className="mx-page flex max-w-5xl flex-col gap-6">
      {backLink}

      <header className="rounded-hero border border-line bg-surface p-6 shadow-warm-1 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {superseded ? (
            <Badge tone="medium">
              <ClockCounterClockwise size={14} weight="bold" className="mr-1.5" aria-hidden />
              Superseded
            </Badge>
          ) : (
            <Badge tone="success">
              <CheckCircle size={14} weight="fill" className="mr-1.5" aria-hidden />
              Confirmed{subject.confirmedAt ? ` ${dateTime.format(new Date(subject.confirmedAt))}` : ""}
            </Badge>
          )}
        </div>
        <h1 className="display max-w-[40ch] text-balance text-[clamp(1.75rem,3.2vw,2.25rem)] text-ink-display">
          {subject.content ?? "Confirmed decision"}
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
                  <p className="mt-1 text-[13px] text-ink-3">
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
                        className="group inline-flex flex-col rounded-md hover:text-ink"
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

        <div className="flex min-w-0 flex-col gap-6">
          <Note>Only confirmed decisions appear in a lineage. Nothing your agent proposed is saved until someone confirms it.</Note>
          <LinkButton href={`/meetings/${params.meetingId}`} variant="outline" className="self-start">
            Open meeting
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
