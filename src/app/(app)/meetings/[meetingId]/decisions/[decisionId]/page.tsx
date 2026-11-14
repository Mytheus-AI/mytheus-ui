import type { Metadata } from "next";
import { AskAboutButton } from "@/components/ask-myte/AskBox";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, ChatCircleText, CheckCircle, ClockCounterClockwise, GitCommit, Scales, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { Chip } from "@/components/ui/Chip";
import { LinkButton } from "@/components/ui/Button";
import { Note } from "@/components/ui/Note";
import { SectionCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Page, PageColumns, PageHead } from "@/components/ui/Page";
import { Crumb } from "@/components/app/Crumb";
import { fetchDecisionLineage, type LineageDecision } from "@/lib/api/lineage";
import { loadDecisionReach } from "@/lib/api/decision-reach";
import { resolveOrgContext } from "@/lib/api/org-context";
import { DecisionReach } from "@/components/decisions/DecisionReach";
import { ChallengesSection } from "@/components/decisions/ChallengesSection";
import { ChallengesSkeleton } from "@/components/decisions/ChallengesStates";
import { AgreementCard } from "@/components/room-signals/AgreementCard";
import { fetchAfterSignals, fetchDecisionAgreement } from "@/lib/api/room-signals";
import { lateLabel, strengthChip } from "@/lib/room-signals";
import { DecisionWhySection } from "@/components/decision-why/DecisionWhySection";
import { ReopenedChip, isReopened } from "@/components/decision-why/ReopenedChip";
import { BlastRadiusSection } from "@/components/blast-radius/BlastRadiusSection";
import { fetchDecisionWhy } from "@/lib/api/decision-why";
import { fetchBlastRadius } from "@/lib/api/blast-radius";
import { DecisionBet } from "@/components/bets/DecisionBet";
import { fetchDecisionBet } from "@/lib/api/bets";
import { zonedFormat } from "@/lib/timezone-server";

export const metadata: Metadata = { title: "Decision lineage | Mytheus" };

/* Decision lineage (Plan 7-9 section 3.8 step 3): the FOLLOWS_FROM chain around one confirmed
   decision, oldest first. What it superseded comes before it, what superseded it comes after.
   Read from `bff` -> `knowledge-graph-service`'s `decision_lineage` template, which only ever
   holds confirmed decisions. With no gateway configured the page says history is unavailable
   rather than showing a sample. The topbar breadcrumb reads Meetings / the meeting / the decision
   (the meeting's title comes from the meeting layout).

   Phase 4 reach: the aside shares the record (Copy share link, Export to Notion, Confluence or
   Slack). Every export and share carries this same lineage, built by the server as the person
   may see it.

   Decisions that follow you (Beyond the meeting, Layer 2): under the lineage, "Challenged in N
   places" lists where people wrote something that goes against the decision, and the requests to
   reopen it, streamed on its own so the lineage never waits. `?reopen=<id>` (the Inbox link)
   focuses one request. */

type ChainNode = {
  id: string;
  meetingId: string | null;
  content: string | null;
  status: string | null;
  confirmedAt: string | null;
  role: "ancestor" | "subject" | "descendant";
};

const dateTime = () => zonedFormat({
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const shortDate = () => zonedFormat({ month: "short", day: "numeric", year: "numeric" });

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
  searchParams,
}: {
  params: { meetingId: string; decisionId: string };
  searchParams?: { reopen?: string | string[] };
}) {
  const focusReopenId = typeof searchParams?.reopen === "string" ? searchParams.reopen : null;
  const [chain, reach, org, agreement, after, why, blast, bet] = await Promise.all([
    loadChain(params.meetingId, params.decisionId),
    loadDecisionReach(params.decisionId).catch(() => null),
    resolveOrgContext(),
    // a3 room signals: how strongly the room agreed, and late points while the decision is new.
    fetchDecisionAgreement(params.decisionId).catch(() => ({ ok: false as const, reason: "error" as const })),
    fetchAfterSignals(params.meetingId).catch(() => ({ ok: false as const, reason: "error" as const })),
    // a4: why we decided, and what a change would ripple into.
    fetchDecisionWhy(params.decisionId),
    fetchBlastRadius(params.decisionId),
    // b1: what this decision bets on.
    fetchDecisionBet(params.decisionId).catch(() => null),
  ]);
  const signal = after.ok ? after.data.decisions.find((d) => d.decision_id === params.decisionId) ?? null : null;
  const weak = strengthChip(agreement.ok ? agreement.data.strength : signal?.agreement);
  const lateInWindow = signal && signal.in_window && signal.late_contribution_count > 0 ? signal.late_contribution_count : 0;
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
        action={
          <>
            <AskAboutButton kind="decision" id={params.decisionId} title={clip(title)} />
            {openMeeting}
          </>
        }
        context={
          <span className="inline-flex flex-wrap items-center gap-2">
            {isReopened(why) ? (
              <ReopenedChip why={why} />
            ) : superseded ? (
              <Chip tone="medium" icon={<ClockCounterClockwise size={14} weight="bold" />}>
                Superseded
              </Chip>
            ) : (
              <Chip tone="ok" icon={<CheckCircle size={14} weight="fill" />}>
                Confirmed{subject.confirmedAt ? ` ${dateTime().format(new Date(subject.confirmedAt))} UTC` : ""}
              </Chip>
            )}
            {weak ? (
              <Chip tone={weak.tone} title={weak.hint}>
                {weak.label}
              </Chip>
            ) : null}
            {lateInWindow ? (
              <Link href={`/meetings/${params.meetingId}#late`} className="rounded-full">
                <Chip tone="accent" icon={<ChatCircleText size={14} />}>
                  {lateLabel(lateInWindow)}
                </Chip>
              </Link>
            ) : null}
          </span>
        }
      />

      <PageColumns
        sticky={false}
        aside={
          <div className="flex flex-col gap-5">
            {reach ? (
              <DecisionReach
                decisionId={params.decisionId}
                meetingId={params.meetingId}
                destinations={reach.destinations}
                exports={reach.exports}
                links={reach.links}
                shareable={reach.shareable}
                isAdmin={org?.user.role === "admin"}
              />
            ) : null}
            <Note>Only confirmed decisions appear in a lineage. Nothing your Myte proposed is saved until someone confirms it.</Note>
          </div>
        }
      >
        <DecisionWhySection decisionId={params.decisionId} initial={why} />
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
                    {node.confirmedAt ? `, ${shortDate().format(new Date(node.confirmedAt))}` : ""}
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
        <DecisionBet
          initial={bet}
          decisionId={params.decisionId}
          meetingId={params.meetingId}
          decisionContent={title}
          today={new Date().toISOString().slice(0, 10)}
        />
        {/* The column's space-y spaces the sections, so an absent one (no agreement read yet)
            leaves no gap behind. */}
        <AgreementCard read={agreement} />
        <Suspense fallback={<ChallengesSkeleton />}>
          <ChallengesSection
            decisionId={params.decisionId}
            meetingId={params.meetingId}
            superseded={superseded}
            focusReopenId={focusReopenId}
          />
        </Suspense>
        <BlastRadiusSection decisionId={params.decisionId} initial={blast} />
      </PageColumns>
    </Page>
  );
}
