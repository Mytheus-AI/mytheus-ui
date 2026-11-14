import type { Metadata } from "next";
import { FeedbackInbox } from "@/components/ops/FeedbackInbox";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { PageHead } from "@/components/ui/Page";
import Link from "next/link";
import { loadFeedbackInbox } from "@/lib/api/admin-ops";

export const metadata: Metadata = { title: "Feedback | Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* The feedback inbox (ADR-0046 D6): bug reports and feedback members send from Settings, from
   every workspace. The one place /ops shows text a member wrote, and they wrote it to us. Each
   read and each change is in the ops audit log. The state filter rides in the query string (a
   state, never a workspace id). */

const STATES = ["new", "seen", "resolved", "all"] as const;
type State = (typeof STATES)[number];

export default async function OpsFeedbackPage({ searchParams }: { searchParams: { state?: string } }) {
  const state: State = STATES.includes(searchParams.state as State) ? (searchParams.state as State) : "new";
  const res = await loadFeedbackInbox(state);

  if (res.kind !== "live") {
    return (
      <div className="flex flex-col gap-5 [&>header:first-child]:-mb-5">
        <PageHead title="Feedback" context="Bug reports and feedback from members." />
        {res.kind === "forbidden" ? <Note tone="error">This account is not on the Mytheus staff list.</Note> : <ErrorState title="The feedback inbox could not be loaded" />}
      </div>
    );
  }

  const c = res.data.counts;
  const tabs: { state: State; label: string }[] = [
    { state: "new", label: `New (${c.new ?? 0})` },
    { state: "seen", label: `Seen (${c.seen ?? 0})` },
    { state: "resolved", label: `Resolved (${c.resolved ?? 0})` },
    { state: "all", label: "All" },
  ];

  return (
    <div className="flex flex-col gap-5 [&>header:first-child]:-mb-5">
      <PageHead title="Feedback" context="Bug reports and feedback members sent from Settings, Report a bug. Newest first; answer from the reporter's email." />
      <nav aria-label="Feedback by state" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.state}
            href={`/ops/feedback?state=${t.state}`}
            aria-current={t.state === state ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${
              t.state === state ? "border-pill bg-pill text-pill-on" : "border-line text-ink-2 hover:bg-surface-2"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <FeedbackInbox items={res.data.items} />
    </div>
  );
}
