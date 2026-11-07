"use client";

import Link from "next/link";
import { ArrowUpRight, VideoCamera } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatLong, type Task } from "./dates";
import { CheckButton, DueChip, PriorityBadge } from "./task-ui";

/* Read-only quick view. Every field here comes from the action item; nothing is editable
   until the tasks endpoint and its Server Actions exist. */
export function TaskDetailHeader({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <>
      <CheckButton title={task.title} done={task.done} onToggle={onToggle} large />
      <Badge tone={task.done ? "success" : "default"} className="ml-2">
        {task.done ? "Done" : "Open"}
      </Badge>
    </>
  );
}

export function TaskDetailBody({ task, isMine }: { task: Task; isMine: boolean }) {
  return (
    <div className="flex flex-col gap-7">
      <h2 className={`display text-[24px] leading-tight ${task.done ? "text-ink-3 line-through" : "text-ink-display"}`}>
        {task.title}
      </h2>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-5 min-[420px]:grid-cols-2">
        <div className="min-w-0">
          <dt className="kicker uppercase">Assignee</dt>
          <dd className="mt-2 flex min-w-0 items-center gap-2 text-[14px] font-medium text-ink">
            <Avatar name={task.assignee} size="sm" />
            <span className="truncate">
              {task.assignee}
              {isMine ? " (you)" : ""}
            </span>
          </dd>
        </div>
        <div>
          <dt className="kicker uppercase">Due</dt>
          <dd className="mt-2 flex flex-wrap items-center gap-2">
            <DueChip dueDate={task.dueDate} done={task.done} />
          </dd>
          <dd className="mt-1.5 text-[12.5px] text-ink-3">{formatLong(task.dueDate)}</dd>
        </div>
        <div>
          <dt className="kicker uppercase">Priority</dt>
          <dd className="mt-2">
            <PriorityBadge priority={task.priority} />
          </dd>
        </div>
      </dl>

      <section aria-labelledby="task-meeting-heading">
        <h3 id="task-meeting-heading" className="kicker uppercase">
          Linked meeting
        </h3>
        <Link
          href={`/meetings/${task.meetingId}`}
          className="group mt-2 flex items-center gap-3 rounded-pill border border-line p-3 transition-colors hover:border-line-2 hover:bg-bg active:bg-bg-2"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-signal-soft text-signal-deep">
            <VideoCamera size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink">{task.meetingTitle}</span>
            <span className="block text-[12.5px] text-ink-3">Where this was captured</span>
          </span>
          <ArrowUpRight size={16} className="shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
