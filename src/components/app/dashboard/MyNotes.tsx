import type { CSSProperties } from "react";
import Link from "next/link";
import { Notepad } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/Card";
import { CardHead, EmptyBlock } from "./parts";
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
  className,
  style,
}: {
  notes: DashboardNote[];
  failed: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const recent = notes.slice(0, 4);
  return (
    <Card role="region" aria-labelledby="notes-title" className={`p-0 ${className ?? ""}`} style={style}>
      <CardHead id="notes-title" title="Your notes" />
      {recent.length > 0 ? (
        <ul className="divide-y divide-line pb-2">
          {recent.map((n) => (
            <li key={n.id}>
              <Link
                href={`/meetings/${n.meeting_id}`}
                className="block min-h-[44px] px-[18px] py-[13px] transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3 sm:px-[22px]"
              >
                <span className="line-clamp-3 block whitespace-pre-line text-[13.5px] leading-snug text-ink">
                  {n.content}
                </span>
                <span className="mt-1.5 block text-[12.5px] text-ink-3">
                  {n.meeting_title ?? "Untitled meeting"}, {formatShortDate(n.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyBlock
          icon={<Notepad size={24} aria-hidden />}
          title={failed ? "Notes are unavailable" : "No notes yet"}
          text={
            failed
              ? "Your notes could not be loaded right now. They are still saved."
              : "During a call, your agent writes notes that matter to you. They collect here."
          }
        />
      )}
    </Card>
  );
}
