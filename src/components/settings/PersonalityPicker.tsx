"use client";

import { Check } from "@phosphor-icons/react";
import { PERSONALITY_PRESETS, type AgentPersonality } from "@/lib/api/profile-types";

/* The five personalities as cards, each with the same note written in its voice. Native radio
   inputs underneath, so arrow keys move the choice and a screen reader hears "Concise, radio,
   2 of 5" plus the description; the card is only their label. */

export function PersonalityPicker({
  name,
  value,
  onChange,
  legend,
  legendClassName = "",
  describedBy,
}: {
  name: string;
  value: AgentPersonality;
  onChange: (next: AgentPersonality) => void;
  legend: string;
  legendClassName?: string;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className={legendClassName}>{legend}</legend>
      <div className="grid gap-2">
        {PERSONALITY_PRESETS.map((p) => {
          const on = p.id === value;
          const descId = `${name}-${p.id}-desc`;
          return (
            <label
              key={p.id}
              className={`relative flex cursor-pointer items-start gap-3 rounded-ctl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                on
                  ? "border-signal bg-surface-2 shadow-[0_0_0_1px_var(--signal)]"
                  : "border-line-2 bg-surface hover:border-ink-4 hover:bg-surface-2"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={p.id}
                checked={on}
                onChange={() => onChange(p.id)}
                aria-describedby={descId}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                  on ? "border-signal bg-signal text-pill-on" : "border-line-2 bg-surface"
                }`}
              >
                {on ? <Check size={12} weight="bold" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[15px] font-semibold text-ink">{p.label}</span>
                  <span className="text-[14px] text-ink-3">{p.blurb}</span>
                </span>
                <span id={descId} className="mt-1.5 block font-display text-[15px] italic leading-snug text-ink-2">
                  <span className="sr-only">{p.blurb} A note would read: </span>
                  &ldquo;{p.sample}&rdquo;
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
