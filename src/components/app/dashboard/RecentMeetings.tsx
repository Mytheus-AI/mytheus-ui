import Link from "next/link";
import type { CSSProperties } from "react";
import { CheckSquare, Scales, UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { DashboardRecentMeeting } from "@/lib/api/types";
import { LocalTime } from "./LiveTime";
import { CardHead, cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { TextLink } from "@/components/ui/TextLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDuration, minutesBetween, plural } from "./format";

/** Catch up: your ended meetings and what was kept from each (`/bff/dashboard`
 *  `recent_meetings`). The counts are confirmed decisions and tasks only; a candidate nobody
 *  confirmed is not one.
 *
 *  This is where the memory line lives on Home: one coral thread joins the meetings, newest at the
 *  top, and a filled bead marks each meeting that carried something forward. A meeting that kept
 *  nothing gets a hollow bead. The thread draws once on load (`.mx-thread`, reduced motion shows
 *  it whole). */
export function RecentMeetings({ meetings, failed }: { meetings: DashboardRecentMeeting[]; failed: boolean }) {
  const kept = meetings.reduce((n, m) => n + m.decision_count + m.action_count, 0);
  return (
    <section aria-labelledby="catch-up-title" className={cardClass({ flush: true })}>
      <CardHead
        id="catch-up-title"
        title="Catch up"
        caption={!failed && meetings.length > 0 ? "What your recent meetings carried forward" : undefined}
        right={<TextLink href="/meetings">All meetings</TextLink>}
      />
      {failed ? (
        <ErrorState variant="inline" title="We could not load recent meetings" text="Your meetings are safe. Try again in a moment." />
      ) : meetings.length > 0 ? (
        <>
          <ol className="px-[18px] pb-2 pt-1 sm:px-[22px]">
            {meetings.map((m, i) => {
              const start = m.scheduled_start ?? m.created_at;
              const minutes = minutesBetween(m.scheduled_start ?? undefined, m.scheduled_end ?? undefined);
              const carried = m.decision_count + m.action_count > 0;
              const last = i === meetings.length - 1;
              const delay = { "--dl": `${0.15 + i * 0.14}s` } as CSSProperties;
              return (
                <li key={m.id} className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-x-3">
                  {/* The thread runs from this bead's centre to the next one's. */}
                  {!last ? (
                    <span
                      aria-hidden
                      style={delay}
                      className="mx-thread absolute -bottom-[23px] left-[9px] top-[23px] w-0.5 rounded-full bg-signal-line"
                    />
                  ) : null}
                  <span aria-hidden className="relative z-[1] flex justify-center pt-[17px]">
                    <span
                      style={delay}
                      className={`mx-bead-in h-[13px] w-[13px] rounded-full border-2 ${
                        carried
                          ? "border-signal-line bg-signal-line shadow-[0_0_0_4px_var(--signal-soft)]"
                          : "border-line-2 bg-surface"
                      }`}
                    />
                  </span>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="-mx-2 my-0.5 grid min-h-[44px] gap-x-4 gap-y-2 rounded-ctl px-2 py-2.5 transition-colors duration-150 hover:bg-surface-2 active:bg-bg-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold leading-snug text-ink">
                        {m.title ?? "Untitled meeting"}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-3">
                        <span>
                          <LocalTime iso={start} variant="when" />
                          {minutes ? `, ${formatDuration(minutes)}` : null}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UsersThree size={14} aria-hidden />
                          {plural(m.participant_count, "person", "people")}
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5 sm:justify-end">
                      {carried ? (
                        <>
                          {m.decision_count > 0 ? (
                            <Chip>
                              <Scales size={13} aria-hidden />
                              {plural(m.decision_count, "decision", "decisions")}
                            </Chip>
                          ) : null}
                          {m.action_count > 0 ? (
                            <Chip>
                              <CheckSquare size={13} aria-hidden />
                              {plural(m.action_count, "task", "tasks")}
                            </Chip>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-[12.5px] text-ink-3">Nothing confirmed</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="border-t border-line bg-surface-2 px-[18px] py-3 text-[14px] text-ink-3 sm:px-[22px]">
            {kept > 0
              ? `${plural(kept, "item", "items")} carried forward from your last ${plural(meetings.length, "meeting", "meetings")}.`
              : "Confirm decisions and tasks after a call and they carry forward here."}
          </p>
        </>
      ) : (
        <EmptyState inCard art="meetings"
          title="No finished meetings yet"
          description="Once you have been in a meeting, it shows up here with the decisions and tasks confirmed in it."
          action={<TextLink href="/meetings">Open meetings</TextLink>}
        />
      )}
    </section>
  );
}
