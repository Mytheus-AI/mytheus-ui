import Link from "next/link";
import { CaretRight, Clock } from "@phosphor-icons/react/dist/ssr";
import type { DashboardTask } from "@/lib/api/types";
import { CardHead, cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { TextLink } from "@/components/ui/TextLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { daysFromNow, dueLabel } from "./format";

const SHOWN = 5;

/** Your open action items, from `/bff/dashboard` `action_items`: the same confirmed rows as
 *  `/work/tasks`, soonest due first. Read-only here: completing a task lives on /tasks, so each row
 *  links there instead of offering a checkbox that would only change local state. */
export function TaskList({
  tasks,
  failed,
  nowIso,
  className = "",
}: {
  tasks: DashboardTask[];
  failed: boolean;
  nowIso: string;
  className?: string;
}) {
  const now = new Date(nowIso);
  const shown = tasks.slice(0, SHOWN);
  const more = tasks.length - shown.length;

  return (
    <section aria-labelledby="tasks-title" className={cardClass({ flush: true, className })}>
      <CardHead
        id="tasks-title"
        title="Your tasks"
        right={
          failed ? null : (
            <span className="text-[12.5px] font-semibold text-ink-3">
              {tasks.length > 0 ? `${tasks.length} open` : "All done"}
            </span>
          )
        }
      />

      {failed ? (
        <ErrorState variant="inline" title="We could not load your tasks" text="Your tasks are safe. Try again in a moment." />
      ) : shown.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line">
          {shown.map((task) => {
            const diff = task.due_date ? daysFromNow(task.due_date, now) : null;
            const tone = diff === null ? "neutral" : diff < 0 ? "high" : diff === 0 ? "medium" : "neutral";
            return (
              <li key={task.id}>
                <Link
                  href="/work/tasks"
                  className="group flex min-h-[52px] items-center gap-3 px-[18px] py-[11px] transition-colors duration-150 hover:bg-surface-2 active:bg-bg-2 sm:px-[22px]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium leading-snug text-ink">{task.content}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">
                      From {task.meeting_title ?? "an untitled meeting"}
                    </span>
                  </span>
                  {task.due_date ? (
                    <Chip tone={tone} className="shrink-0">
                      {tone === "high" ? <Clock size={13} weight="fill" aria-hidden /> : null}
                      {dueLabel(task.due_date, now)}
                    </Chip>
                  ) : null}
                  <CaretRight
                    size={14}
                    weight="bold"
                    aria-hidden
                    className="shrink-0 text-ink-4 transition-[transform,color] duration-150 group-hover:text-ink motion-safe:group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState inCard art="tasks"
          title="No open tasks"
          description="Action items assigned to you and confirmed in meetings show up here until they are done."
        />
      )}

      {!failed ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-line px-[18px] py-1.5 sm:px-[22px]">
          <TextLink href="/work/tasks">All tasks</TextLink>
          {more > 0 ? <span className="text-[12.5px] text-ink-3">{more} more open</span> : null}
        </div>
      ) : null}
    </section>
  );
}
