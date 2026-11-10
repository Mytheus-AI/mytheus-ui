import Link from "next/link";
import { CardHead, cardClass } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatShortDate } from "./format";

/** The dashboard's slice of `/bff/dashboard` `worklogs`: the caller's own surfaced notes. */
export type DashboardNote = {
  id: string;
  meeting_id: string;
  meeting_title: string | null;
  content: string;
  created_at: string;
};

/** Your agent's most recent notes across meetings (PersonalListenerAgent, surfaced only).
 *  Real data: `bff` reads them from `worklogs` for the signed-in user alone. */
export function MyNotes({
  notes,
  failed,
  className = "",
}: {
  notes: DashboardNote[];
  failed: boolean;
  className?: string;
}) {
  const recent = notes.slice(0, 4);
  return (
    <section aria-labelledby="notes-title" className={cardClass({ flush: true, className })}>
      <CardHead id="notes-title" title="Your notes" caption="What your agent kept for you" />
      {recent.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line pb-1">
          {recent.map((n) => (
            <li key={n.id}>
              <Link
                href={`/meetings/${n.meeting_id}`}
                className="block min-h-[44px] px-[18px] py-[13px] transition-colors duration-150 hover:bg-surface-2 active:bg-bg-2 sm:px-[22px]"
              >
                <span className="line-clamp-3 block whitespace-pre-line text-[14px] leading-snug text-ink">{n.content}</span>
                <span className="mt-1.5 block text-[12.5px] text-ink-3">
                  {n.meeting_title ?? "Untitled meeting"}, {formatShortDate(n.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : failed ? (
        <ErrorState variant="inline" title="Notes are unavailable" text="They could not be loaded right now. They are still saved." />
      ) : (
        <EmptyState inCard art="notes" title="No notes yet" description="During a call, your agent writes notes that matter to you. They collect here." />
      )}
    </section>
  );
}
