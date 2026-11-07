import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Prohibit, Quotes } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note, PageHeader } from "@/components/settings/primitives";
import { StatCard, thClass } from "@/components/admin/StatCard";
import { mockCollaborations, mockMeetings, type AgentCollaboration } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Agent collaboration | Mytheus" };

/* The agent collaboration log (Plan 10-13 section 3.5): every time one participant's agent
   asked another's for context during this meeting. Later it reads
   `GET /api/v1/meetings/:id/collaborations` (`agent_collaborations`); today, mock rows.
   Denials are shown, not hidden, and visibly distinct: they are the access policy working. */

export function generateStaticParams() {
  return mockMeetings.map((m) => ({ meetingId: m.id }));
}

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "UTC" });

const classLabel: Record<AgentCollaboration["queryClass"], string> = {
  context_fill: "Context fill",
  decision_history: "Decision history",
  stakeholder: "Stakeholder",
  dependency: "Dependency",
};

const outcome: Record<AgentCollaboration["outcome"], { label: string; tone: "success" | "danger" | "default" }> = {
  granted: { label: "Granted", tone: "success" },
  denied: { label: "Denied", tone: "danger" },
  no_answer: { label: "No answer", tone: "default" },
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function Pair({ from, to }: { from: string; to: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={from} size="sm" />
      <span className="truncate font-semibold text-ink">{from.split(" ")[0]}</span>
      <ArrowRight size={13} className="shrink-0 text-ink-3" aria-label="asked" />
      <Avatar name={to} size="sm" />
      <span className="truncate font-semibold text-ink">{to.split(" ")[0]}</span>
    </span>
  );
}

function Detail({ row }: { row: AgentCollaboration }) {
  if (row.outcome === "granted" && row.source) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-2">
        <Quotes size={14} weight="fill" className="shrink-0 text-signal-deep" aria-hidden />
        <span className="truncate">{row.source}</span>
      </span>
    );
  }
  if (row.outcome === "denied") {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-priority-high">
        <Prohibit size={14} weight="bold" className="shrink-0" aria-hidden />
        <span className="truncate">{row.reason ?? "Denied by policy"}</span>
      </span>
    );
  }
  return <span className="text-ink-3">Fell through silently, nothing shown</span>;
}

export default function CollaborationsPage({ params }: { params: { meetingId: string } }) {
  const meeting = mockMeetings.find((m) => m.id === params.meetingId);
  if (!meeting) notFound();

  const rows = mockCollaborations
    .filter((c) => c.meetingId === meeting.id)
    .sort((a, b) => a.at.localeCompare(b.at));
  const granted = rows.filter((r) => r.outcome === "granted");
  const denied = rows.filter((r) => r.outcome === "denied");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <Link
        href={`/meetings/${meeting.id}`}
        className="inline-flex items-center gap-1.5 self-start rounded-md text-[13px] font-semibold text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden />
        {meeting.title}
      </Link>

      <PageHeader
        title="Agent collaboration"
        description="When one person's agent needed context another person's agent had, it asked. Every request is logged here, including the ones policy refused."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Requests" value={rows.length} />
        <StatCard label="Granted" value={granted.length} />
        <StatCard label="Denied" value={denied.length} />
        <StatCard label="Median latency" value={rows.length ? `${median(rows.map((r) => r.latencyMs))} ms` : "–"} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No agent collaboration in this meeting"
          description="Agents only ask each other when one is missing context the other can cite."
        />
      ) : (
        <section aria-label="Collaboration log" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
          <table className="hidden w-full border-collapse text-left text-[14px] md:table">
            <thead>
              <tr className="bg-bg">
                <th scope="col" className={thClass}>Time</th>
                <th scope="col" className={thClass}>Requester &rarr; responder</th>
                <th scope="col" className={thClass}>Asked for</th>
                <th scope="col" className={thClass}>Outcome</th>
                <th scope="col" className={thClass}>Answer or reason</th>
                <th scope="col" className={`${thClass} text-right`}>Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className={r.outcome === "denied" ? "bg-priority-high-soft" : "transition-colors hover:bg-bg"}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12.5px] tabular-nums text-ink-3">{time.format(new Date(r.at))}</td>
                  <td className="max-w-[260px] px-5 py-3.5">
                    <Pair from={r.requester} to={r.responder} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">{classLabel[r.queryClass]}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={outcome[r.outcome].tone}>{outcome[r.outcome].label}</Badge>
                  </td>
                  <td className="max-w-[300px] px-5 py-3.5">
                    <Detail row={r} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-ink-2">{r.latencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-line md:hidden">
            {rows.map((r) => (
              <li key={r.id} className={`px-4 py-4 text-[13.5px] ${r.outcome === "denied" ? "bg-priority-high-soft" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <Pair from={r.requester} to={r.responder} />
                  <Badge tone={outcome[r.outcome].tone} className="shrink-0">
                    {outcome[r.outcome].label}
                  </Badge>
                </div>
                <p className="mt-2 text-ink-3">
                  {classLabel[r.queryClass]} &middot; {time.format(new Date(r.at))} &middot; {r.latencyMs} ms
                </p>
                <div className="mt-1.5 flex min-w-0">
                  <Detail row={r} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Note>Sample log. It fills from your meetings once agent-to-agent context sharing is live.</Note>
    </div>
  );
}
