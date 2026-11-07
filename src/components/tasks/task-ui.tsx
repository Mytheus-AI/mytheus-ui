"use client";

import type { MouseEvent } from "react";
import { CalendarBlank, CalendarCheck, Check, Flag, WarningCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { dueInfo, type DueTone } from "./dates";
import type { Priority } from "@/lib/mock/data";

const dueToneClass: Record<DueTone, string> = {
  overdue: "bg-priority-high-soft text-priority-high",
  today: "bg-priority-medium-soft text-priority-medium",
  quiet: "bg-bg-2 text-ink-2",
};

/** Due date chip: tinted when overdue or due today, with an icon so colour is never the only cue. */
export function DueChip({ dueDate, done }: { dueDate: string; done: boolean }) {
  const info = dueInfo(dueDate, done);
  const Icon = info.icon === "warning" ? WarningCircle : info.icon === "done" ? CalendarCheck : CalendarBlank;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium ${dueToneClass[info.tone]}`}
    >
      <Icon size={14} weight={info.tone === "overdue" ? "fill" : "regular"} aria-hidden />
      {info.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={priority} className="gap-1.5 whitespace-nowrap">
      <Flag size={12} weight="fill" aria-hidden />
      <span className="capitalize">{priority}</span>
      <span className="sr-only"> priority</span>
    </Badge>
  );
}

export function CheckButton({
  title,
  done,
  onToggle,
  large = false,
}: {
  title: string;
  done: boolean;
  onToggle: () => void;
  large?: boolean;
}) {
  const stop = (e: MouseEvent) => e.stopPropagation();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Reopen "${title}"` : `Complete "${title}"`}
      onClick={(e) => {
        stop(e);
        onToggle();
      }}
      className="group/check -m-2 grid h-10 w-10 shrink-0 place-items-center rounded-full"
    >
      <span
        className={`grid place-items-center rounded-full border transition-[background-color,border-color,transform] duration-150 motion-safe:group-active/check:scale-90 ${
          large ? "h-7 w-7" : "h-6 w-6"
        } ${
          done
            ? "border-signal bg-signal text-white"
            : "border-line-2 bg-surface text-transparent group-hover/check:border-signal group-hover/check:text-signal"
        }`}
      >
        <Check size={large ? 15 : 13} weight="bold" aria-hidden />
      </span>
    </button>
  );
}
