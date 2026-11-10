"use client";

import type { MouseEvent } from "react";
import { CalendarBlank, CalendarCheck, Check, Flag, WarningCircle } from "@phosphor-icons/react";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { dueInfo, type DueTone } from "./dates";
import type { Priority } from "@/lib/types";

const dueTone: Record<DueTone, ChipTone> = { overdue: "high", today: "medium", quiet: "neutral" };

/** Due date chip: red when overdue (acts now), amber when due today (attention), neutral otherwise,
 *  always with an icon so colour is never the only cue. */
export function DueChip({ dueDate, done }: { dueDate: string | null; done: boolean }) {
  const info = dueInfo(dueDate, done);
  const Icon = info.icon === "warning" ? WarningCircle : info.icon === "done" ? CalendarCheck : CalendarBlank;
  return (
    <Chip tone={dueTone[info.tone]} icon={<Icon size={14} weight={info.tone === "overdue" ? "fill" : "regular"} />}>
      {info.label}
    </Chip>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Chip tone={priority} icon={<Flag size={12} weight="fill" />}>
      <span className="capitalize">{priority}</span>
      <span className="sr-only"> priority</span>
    </Chip>
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
            ? "border-signal bg-signal text-pill-on"
            : "border-ink-4 bg-surface text-transparent group-hover/check:border-signal group-hover/check:text-signal"
        }`}
      >
        <Check size={large ? 15 : 13} weight="bold" aria-hidden />
      </span>
    </button>
  );
}
