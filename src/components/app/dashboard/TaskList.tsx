import type { CSSProperties } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CaretRight, CheckSquare, Clock } from "@phosphor-icons/react/dist/ssr";
import type { DashboardTask } from "@/lib/api/types";
import { CardHead, Chip, EmptyBlock, ErrorBlock, TextLink } from "./parts";
import { daysFromNow, dueLabel } from "./format";

const SHOWN = 5;

/** Your open action items, from `/bff/dashboard` `action_items`: the same confirmed rows as
 *  `/tasks`, soonest due first. Read-only here: completing a task lives on /tasks, so each row
 *  links there instead of offering a checkbox that would only change local state. */
export function TaskList({
  tasks,
  failed,
  nowIso,
  className,
  style,
}: {
  tasks: DashboardTask[];
  failed: boolean;
  nowIso: string;
  className?: string;
  style?: CSSProperties;
}) {
  const now = new Date(nowIso);
  const shown = tasks.slice(0, SHOWN);
  const more = tasks.length - shown.length;

  return (
    <Card role="region" aria-labelledby="tasks-title" className={`p-0 ${className ?? ""}`} style={style}>
      <CardHead
        id="tasks-title"
        title="Your tasks"
        right={
          failed ? null : (
            <span className="text-[13px] font-semibold text-ink-3">
              {tasks.length > 0 ? `${tasks.length} open` : "All done"}
            </span>
          )
        }
      />

      {failed ? (
        <ErrorBlock title="We could not load your tasks" text="Your tasks are safe. Try again in a moment." />
      ) : shown.length > 0 ? (
        <ul className="divide-y divide-line">
          {shown.map((task) => {
            const overdue = task.due_date ? daysFromNow(task.due_date, now) < 0 : false;
            return (
              <li key={task.id}>
                <Link
                  href="/tasks"
                  className="group flex min-h-[44px] items-center gap-3 px-[18px] py-[11px] transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3 sm:px-[22px]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium leading-snug text-ink">{task.content}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">
                      From {task.meeting_title ?? "an untitled meeting"}
                    </span>
                  </span>
                  {task.due_date ? (
                    <Chip tone={overdue ? "high" : "neutral"} className="shrink-0">
                      {overdue ? <Clock size={13} weight="fill" aria-hidden /> : null}
                      {dueLabel(task.due_date, now)}
                    </Chip>
                  ) : null}
                  <CaretRight
                    size={14}
                    weight="bold"
                    aria-hidden
                    className="shrink-0 text-ink-3 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyBlock
          icon={<CheckSquare size={24} aria-hidden />}
          title="No open tasks"
          text="Action items assigned to you and confirmed in meetings show up here until they are done."
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 px-[18px] pb-3.5 pt-1.5 sm:px-[22px]">
        <TextLink href="/tasks">All tasks</TextLink>
        {more > 0 ? <span className="text-[12.5px] text-ink-3">{more} more open</span> : null}
      </div>
    </Card>
  );
}
