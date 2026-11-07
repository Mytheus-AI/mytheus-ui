import type { CSSProperties } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CaretRight, CheckSquare, Clock } from "@phosphor-icons/react/dist/ssr";
import { myOpenTasks } from "./data";
import { CardHead, Chip, EmptyBlock, TextLink } from "./parts";
import { daysFromNow, dueLabel, priorityLabel } from "./format";

/** Open action items assigned to you. Read-only here: completing a task lives on /tasks, so each
 *  row links there instead of offering a checkbox that would only change local state. */
export function TaskList({ className, style }: { className?: string; style?: CSSProperties }) {
  const { mine, teamCount } = myOpenTasks();

  return (
    <Card role="region" aria-labelledby="tasks-title" className={`p-0 ${className ?? ""}`} style={style}>
      <CardHead
        id="tasks-title"
        title="Your tasks"
        right={
          <span className="text-[13px] font-semibold text-ink-3">
            {mine.length > 0 ? `${mine.length} open` : "All done"}
          </span>
        }
      />

      {mine.length > 0 ? (
        <ul className="divide-y divide-line">
          {mine.map((task) => {
            const overdue = daysFromNow(task.dueDate) < 0;
            return (
              <li key={task.id}>
                <Link
                  href="/tasks"
                  className="group flex min-h-[44px] items-center gap-3 px-[18px] py-[11px] transition-colors duration-150 hover:bg-bg-2 active:bg-bg-3 sm:px-[22px]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium leading-snug text-ink">
                      {task.title}
                    </span>
                    <span className="block text-[12.5px] text-ink-3">
                      {priorityLabel[task.priority]}, from {task.meetingTitle}
                    </span>
                  </span>
                  <Chip tone={task.priority} className="shrink-0">
                    {overdue ? <Clock size={13} weight="fill" aria-hidden /> : null}
                    {dueLabel(task.dueDate)}
                  </Chip>
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
          text="Action items assigned to you in meetings will show up here until they are done."
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 px-[18px] pb-3.5 pt-1.5 sm:px-[22px]">
        <TextLink href="/tasks">All tasks</TextLink>
        {teamCount > 0 ? (
          <span className="text-[12.5px] text-ink-3">{teamCount} more open across the team</span>
        ) : null}
      </div>
    </Card>
  );
}
