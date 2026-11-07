"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useOrgContext } from "@/lib/org-context";
import { mockActions, type ActionItem } from "@/lib/mock/data";

/* My Tasks: action items assigned to you, completable in place (visual state
   only — the Server Action + optimistic reconcile wires in when the backend
   lands), plus a read-only view of what the rest of the room owns. */

function TaskRow({
  task,
  done,
  onToggle,
}: {
  task: ActionItem;
  done: boolean;
  onToggle?: () => void;
}) {
  return (
    <Card className="py-4">
      <div className="flex items-center gap-3.5">
        {onToggle ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `Reopen "${task.title}"` : `Complete "${task.title}"`}
            onClick={onToggle}
            className="group/check -my-2 -ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full"
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-full border transition-colors duration-150 ${
                done
                  ? "border-signal bg-signal text-white"
                  : "border-line-2 bg-surface group-hover/check:border-signal/50"
              }`}
            >
              {done && (
                <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
                  <path
                    d="M2.5 6.2 5 8.5 9.5 3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </button>
        ) : (
          <Avatar name={task.assignee} size="sm" />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[14.5px] font-medium ${
              done ? "text-ink-3 line-through" : "text-ink"
            }`}
          >
            {task.title}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
            <Link href={`/meetings/${task.meetingId}`} className="hover:text-ink-2">
              {task.meetingTitle}
            </Link>
            <span aria-hidden>·</span>
            <span>due {task.dueDate.slice(5).replace("-", "/")}</span>
            {!onToggle && (
              <>
                <span aria-hidden>·</span>
                <span>{task.assignee}</span>
              </>
            )}
          </p>
        </div>

        <Badge tone={task.priority} className="hidden shrink-0 capitalize sm:inline-flex">
          {task.priority}
        </Badge>
      </div>
    </Card>
  );
}

export default function TasksPage() {
  const { user } = useOrgContext();
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(
    Object.fromEntries(mockActions.map((a) => [a.id, a.status === "done"])),
  );

  const mine = mockActions.filter((a) => a.assignee === user.name);
  const others = mockActions.filter((a) => a.assignee !== user.name);
  const openCount = mine.filter((a) => !doneMap[a.id]).length;

  const toggle = (id: string) => setDoneMap((m) => ({ ...m, [id]: !m[id] }));

  return (
    <div className="mx-auto max-w-4xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <p className="kicker text-signal">Tasks</p>
      <h1 className="display mt-2 text-[clamp(1.8rem,4vw,2.4rem)]">My tasks</h1>
      <p className="mt-2 text-[14px] text-ink-3">
        {openCount === 0
          ? "All clear — nothing open with your name on it."
          : `${openCount} open item${openCount === 1 ? "" : "s"} with your name on ${openCount === 1 ? "it" : "them"}, captured in meetings and confirmed by you.`}
      </p>

      {mine.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Nothing assigned to you"
          description="Action items you confirm in meetings will land here."
        />
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {mine.map((t) => (
            <TaskRow key={t.id} task={t} done={!!doneMap[t.id]} onToggle={() => toggle(t.id)} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="kicker">Owned by others</h2>
          <div className="mt-3 flex flex-col gap-3">
            {others.map((t) => (
              <TaskRow key={t.id} task={t} done={!!doneMap[t.id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
