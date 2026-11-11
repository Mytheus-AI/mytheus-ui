"use client";

import { useId } from "react";
import { HeadCircuit, Prohibit, User } from "@phosphor-icons/react";
import type { AttendanceChoice } from "@/lib/api/listening-types";
import { CHOICE_LABEL, CHOICES } from "@/lib/listening";

/* Attend / Agent listens / Skip for one meeting: a radio group drawn as a segmented control.
   Native radios underneath, so the arrow keys move between the three, Tab enters and leaves the
   group as one stop, and a screen reader hears "Agent listens, radio, 2 of 3". In a confidential
   meeting "Agent listens" is disabled and the reason is read with the group. */

const ICON = { attend: User, agent_listens: HeadCircuit, skip: Prohibit } as const;

export function ChoiceControl({
  name,
  value,
  onChange,
  label,
  agentDisabledReason = null,
  disabled = false,
  size = "md",
  showIcons = true,
  iconOnly = false,
}: {
  /** unique per group on the page (the meeting id) */
  name: string;
  value: AttendanceChoice;
  onChange: (next: AttendanceChoice) => void;
  /** the group's accessible name ("Your choice for Weekly status") */
  label: string;
  /** set for a confidential meeting: why the agent cannot listen */
  agentDisabledReason?: string | null;
  disabled?: boolean;
  size?: "sm" | "md";
  showIcons?: boolean;
  /** a narrow column: icons only, the label kept for screen readers and the tooltip */
  iconOnly?: boolean;
}) {
  const uid = useId();
  const h = iconOnly ? "h-8 w-8 text-[13px]" : size === "sm" ? "h-8 text-[13px] px-2.5" : "h-10 text-[14px] px-3.5";
  return (
    <div role="radiogroup" aria-label={label} aria-describedby={agentDisabledReason ? `${uid}-why` : undefined} className="min-w-0">
      <div className="inline-flex max-w-full rounded-ctl bg-bg-2 p-[3px]">
        {CHOICES.map((c) => {
          const I = ICON[c];
          const off = disabled || (c === "agent_listens" && Boolean(agentDisabledReason));
          const on = value === c;
          return (
            <label
              key={c}
              title={c === "agent_listens" && agentDisabledReason ? agentDisabledReason : iconOnly ? CHOICE_LABEL[c] : undefined}
              className={`relative inline-flex min-w-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-semibold transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-out)] motion-reduce:transition-none has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-signal ${h} ${
                on ? "bg-surface text-ink shadow-warm-1" : "text-ink-3 hover:text-ink"
              } ${off ? "cursor-not-allowed opacity-45 hover:text-ink-3" : ""}`}
            >
              <input
                type="radio"
                name={`${uid}-${name}`}
                value={c}
                checked={on}
                disabled={off}
                onChange={() => onChange(c)}
                className="sr-only"
              />
              {showIcons || iconOnly ? <I size={size === "sm" ? 14 : 15} weight={on ? "fill" : "regular"} aria-hidden className={on && c === "agent_listens" ? "text-signal" : undefined} /> : null}
              <span className={iconOnly ? "sr-only" : "truncate"}>{CHOICE_LABEL[c]}</span>
            </label>
          );
        })}
      </div>
      {agentDisabledReason ? (
        <span id={`${uid}-why`} className="sr-only">
          {agentDisabledReason}
        </span>
      ) : null}
    </div>
  );
}
