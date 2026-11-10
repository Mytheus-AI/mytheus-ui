import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Books, Prohibit, ShieldWarning } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Note } from "@/components/settings/primitives";
import { StatCard, thClass } from "@/components/admin/StatCard";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { ApiError } from "@/lib/api/client";
import {
  fetchMeetingCollaborations,
  type CollaborationPage,
  type CollaborationResult,
  type CollaborationRow,
} from "@/lib/api/context-fills";

export const metadata: Metadata = { title: "Agent collaboration | Mytheus" };

/* The agent collaboration log (Phase P10, plan 3.5): every time one participant's agent asked
   another agent, or its own knowledge base, for context during this meeting. Reads core-api's
   `GET /api/v1/meetings/:id/collaborations` (`agent_collaborations`), newest first, one page at a
   time. Meeting participants and workspace admins see it; anyone else gets core-api's 404, shown
   as not found. The log never carries what was shared, only who asked whom, why, and how it
   went. Denied and blocked requests are shown, not hidden, and visibly distinct: they are the
   access policy working. */

export const dynamic = "force-dynamic";

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

const CLASS_LABEL: Record<CollaborationRow["query_class"], string> = {
  meeting_context: "Meeting context",
  decision_lineage: "Decision history",
  action_status: "Action status",
};

const SCOPE_LABEL: Record<NonNullable<CollaborationRow["target_scope"]>, string> = {
  self: "Self",
  same_team: "Same team",
  department: "Department",
  org: "Whole org",
};

const HOP_LABEL: Record<CollaborationRow["hop"], string> = {
  peer: "In this meeting",
  related_meeting: "Related meeting",
  rag: "Knowledge base",
};

type Tone = "success" | "danger" | "default" | "warning";
const RESULT: Record<CollaborationResult, { label: string; tone: Tone; kind: "ok" | "miss" | "denied" | "blocked" }> = {
  answered: { label: "Answered", tone: "success", kind: "ok" },
  rag_hit: { label: "Found", tone: "success", kind: "ok" },
  no_answer: { label: "No answer", tone: "default", kind: "miss" },
  rag_miss: { label: "Nothing found", tone: "default", kind: "miss" },
  deadline_miss: { label: "Timed out", tone: "warning", kind: "miss" },
  authz_denied: { label: "Denied by policy", tone: "danger", kind: "denied" },
  org_spoof: { label: "Blocked", tone: "danger", kind: "blocked" },
  foreign_org: { label: "Blocked", tone: "danger", kind: "blocked" },
};

const UNKNOWN_RESULT = { label: "Unknown", tone: "default" as Tone, kind: "miss" as const };
const resultOf = (r: CollaborationRow) => RESULT[r.result] ?? UNKNOWN_RESULT;
const isRefused = (r: CollaborationRow) => {
  const k = resultOf(r).kind;
  return k === "denied" || k === "blocked";
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function names(r: CollaborationRow) {
  const from = r.requester_name?.trim() || "A participant";
  const to = r.responder === "rag" ? "Knowledge base" : r.responder_label?.trim() || "A teammate";
  return { from, to };
}

function Pair({ row }: { row: CollaborationRow }) {
  const { from, to } = names(row);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={from} size="sm" />
      <span className="truncate font-semibold text-ink">{from}</span>
      <ArrowRight size={14} className="shrink-0 text-ink-3" aria-label="asked" />
      {row.responder === "rag" ? (
        <Books size={18} className="shrink-0 text-ink-3" aria-hidden />
      ) : (
        <Avatar name={to} size="sm" />
      )}
      <span className="truncate font-semibold text-ink">{to}</span>
    </span>
  );
}

function Result({ row }: { row: CollaborationRow }) {
  const res = resultOf(row);
  const Icon = res.kind === "blocked" ? ShieldWarning : res.kind === "denied" ? Prohibit : null;
  return (
    <Badge tone={res.tone} className="gap-1.5 whitespace-nowrap">
      {Icon ? <Icon size={13} weight="bold" aria-hidden /> : null}
      {res.label}
    </Badge>
  );
}

const scope = (r: CollaborationRow) => (r.target_scope ? SCOPE_LABEL[r.target_scope] ?? r.target_scope : "None");

export default async function CollaborationsPage({
  params,
  searchParams,
}: {
  params: { meetingId: string };
  searchParams: { cursor?: string };
}) {
  const meeting = await resolveCallMeeting(params.meetingId);
  const cursor = typeof searchParams.cursor === "string" && searchParams.cursor.length <= 512 ? searchParams.cursor : undefined;

  let page: CollaborationPage | null = null;
  try {
    page = await fetchMeetingCollaborations(meeting.id, cursor);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
    page = null; // unreachable or erroring: say so below instead of pretending the log is empty
  }

  const rows = page?.items ?? [];
  const answered = rows.filter((r) => resultOf(r).kind === "ok");
  const refused = rows.filter(isRefused);

  return (
    <div className="mx-page flex flex-col gap-6">
      <div>
        <Link href={`/meetings/${meeting.id}`} className="mx-back">
          <ArrowLeft size={16} weight="bold" aria-hidden />
          {meeting.title}
        </Link>
        <header className="mx-head" style={{ paddingBottom: 0 }}>
          <div className="mx-head-main">
            <h1 className="mx-title">Agent collaboration</h1>
            <p className="mx-sub">
              When someone&rsquo;s agent needed context they were missing, it asked another agent or their own knowledge
              base. Every request is logged here, including the ones policy refused. What was shared is never shown here.
            </p>
          </div>
        </header>
      </div>

      {page === null ? (
        <Note tone="error">The collaboration log could not be loaded just now. Try again in a moment.</Note>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={cursor ? "Requests on this page" : "Requests"} value={rows.length} />
            <StatCard label="Answered" value={answered.length} />
            <StatCard label="Denied or blocked" value={refused.length} />
            <StatCard label="Median latency" value={rows.length ? `${median(rows.map((r) => r.latency_ms))} ms` : "None"} />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title={cursor ? "No older requests" : "No agent collaboration in this meeting"}
              description="Agents only ask for context when the conversation refers to something a participant was missing."
            />
          ) : (
            <section aria-label="Collaboration log" className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
              <table className="hidden w-full border-collapse text-left text-[14px] md:table">
                <thead>
                  <tr className="bg-surface-2">
                    <th scope="col" className={thClass}>Time</th>
                    <th scope="col" className={thClass}>Who asked whom</th>
                    <th scope="col" className={thClass}>Where</th>
                    <th scope="col" className={thClass}>Asked for</th>
                    <th scope="col" className={thClass}>Scope</th>
                    <th scope="col" className={thClass}>Result</th>
                    <th scope="col" className={`${thClass} text-right`}>Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} className={isRefused(r) ? "bg-priority-high-soft" : "transition-colors hover:bg-surface-2"}>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] tabular-nums text-ink-3">
                        {time.format(new Date(r.created_at))}
                      </td>
                      <td className="max-w-[300px] px-5 py-3.5">
                        <Pair row={r} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">{HOP_LABEL[r.hop] ?? r.hop}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">{CLASS_LABEL[r.query_class] ?? r.query_class}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">{scope(r)}</td>
                      <td className="px-5 py-3.5">
                        <Result row={r} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-ink-2">{r.latency_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-line md:hidden">
                {rows.map((r) => (
                  <li key={r.id} className={`px-4 py-4 text-[13.5px] ${isRefused(r) ? "bg-priority-high-soft" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Pair row={r} />
                      <span className="shrink-0">
                        <Result row={r} />
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                      <div>
                        <dt className="text-ink-3">Where</dt>
                        <dd className="text-ink-2">{HOP_LABEL[r.hop] ?? r.hop}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-3">Asked for</dt>
                        <dd className="text-ink-2">{CLASS_LABEL[r.query_class] ?? r.query_class}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-3">Scope</dt>
                        <dd className="text-ink-2">{scope(r)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-3">When</dt>
                        <dd className="tabular-nums text-ink-2">
                          {time.format(new Date(r.created_at))}, {r.latency_ms} ms
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {page.next_cursor || cursor ? (
            <div className="flex items-center gap-3">
              {cursor ? (
                <LinkButton href={`/meetings/${meeting.id}/collaborations`} variant="outline" size="sm">
                  Newest
                </LinkButton>
              ) : null}
              {page.next_cursor ? (
                <LinkButton
                  href={`/meetings/${meeting.id}/collaborations?cursor=${encodeURIComponent(page.next_cursor)}`}
                  variant="outline"
                  size="sm"
                >
                  Older requests
                </LinkButton>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
