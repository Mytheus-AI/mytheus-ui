import Link from "next/link";
import type { DashboardNote } from "@/lib/api/types";

/* What the agent kept for you lately, on the memory line: one bead per note, newest first, each
   opening its meeting. These are the surfaced notes only (the dashboard's `worklogs` arm), so it
   is exactly what you would have seen live. `null` is "could not load", `[]` is "nothing yet". */

const DAY = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

export function KeptNotes({ notes }: { notes: DashboardNote[] | null }) {
  return (
    <section aria-labelledby="kept-h" className="rounded-card border border-line bg-surface p-5 shadow-warm-1 sm:p-6">
      <h2 id="kept-h" className="display text-[22px] text-ink">
        Lately, it kept for you
      </h2>

      {notes === null ? (
        <p className="mt-3 text-[15px] text-ink-3">Recent notes could not be loaded right now.</p>
      ) : notes.length === 0 ? (
        <p className="mt-3 text-[15px] text-ink-3">
          Nothing yet. Your agent starts keeping notes in your next meeting, and only you see them.
        </p>
      ) : (
        <ol className="relative mt-4">
          <span aria-hidden className="absolute bottom-3 left-[6px] top-3 w-[2px] rounded-full bg-[var(--signal-line)] opacity-60" />
          {notes.map((n, i) => (
            <li key={n.id} className="relative pb-4 pl-7 last:pb-0">
              <span
                aria-hidden
                className={`absolute left-0 top-[5px] block h-[14px] w-[14px] rounded-full border-2 border-[var(--signal-line)] ${
                  i === 0 ? "bg-signal" : "bg-surface"
                }`}
              />
              <p className="line-clamp-3 text-[15px] leading-relaxed text-ink">{n.content}</p>
              <p className="mt-1 text-[13px] text-ink-3">
                <Link
                  href={`/meetings/${n.meeting_id}`}
                  className="rounded-ctl font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:decoration-signal-line"
                >
                  {n.meeting_title || "A meeting"}
                </Link>
                <span>, {DAY.format(new Date(n.created_at))}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
