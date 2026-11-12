"use client";

import { Check, PencilSimple } from "@phosphor-icons/react";
import { PERSONALITY_PRESETS, type AgentPersonality } from "@/lib/api/profile-types";

/* The five personalities as cards, each with the same note written in its voice. Native radio
   inputs underneath, so arrow keys move the choice and a screen reader hears "Concise, radio,
   2 of 5" plus the description; the card is only their label.

   `layout="grid"` (the Myte settings card) lays them out 3 x 2 from 1024px, 2 across from 768px
   and one column on phones, every card in a row the same height, with a sixth cell, "Your own".
   That cell is a plain button, not a sixth radio: it keeps the personality and hands focus to the
   instructions field (`own.onPick`). Its dashed outline reads as an action. */

export function PersonalityPicker({
  name,
  value,
  onChange,
  legend,
  legendClassName = "",
  describedBy,
  layout = "list",
  own,
}: {
  name: string;
  value: AgentPersonality;
  onChange: (next: AgentPersonality) => void;
  legend: string;
  legendClassName?: string;
  describedBy?: string;
  layout?: "list" | "grid";
  /** The "Your own" cell (grid layout only): `active` when instructions are written. */
  own?: { active: boolean; onPick: () => void };
}) {
  const grid = layout === "grid";
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className={legendClassName}>{legend}</legend>
      <div className={grid ? "grid gap-2 md:grid-cols-2 lg:grid-cols-3" : "grid gap-2"}>
        {PERSONALITY_PRESETS.map((p) => {
          const on = p.id === value;
          const descId = `${name}-${p.id}-desc`;
          return (
            <label
              key={p.id}
              className={`relative flex ${grid ? "h-full" : ""} cursor-pointer items-start gap-3 rounded-ctl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
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
                {grid ? (
                  <>
                    <span className="block text-[15px] font-semibold text-ink">{p.label}</span>
                    <span className="mt-0.5 block text-[14px] text-ink-3">{p.blurb}</span>
                  </>
                ) : (
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[15px] font-semibold text-ink">{p.label}</span>
                    <span className="text-[14px] text-ink-3">{p.blurb}</span>
                  </span>
                )}
                <span id={descId} className="mt-1.5 block font-display text-[15px] italic leading-snug text-ink-2">
                  <span className="sr-only">{p.blurb} A note would read: </span>
                  &ldquo;{p.sample}&rdquo;
                </span>
              </span>
            </label>
          );
        })}
        {grid && own ? (
          <button
            type="button"
            onClick={own.onPick}
            className="tap flex h-full items-start gap-3 rounded-ctl border border-dashed border-line-2 bg-transparent p-3.5 text-left transition-[border-color,background-color] duration-150 hover:border-ink-4 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center text-ink-2">
              <PencilSimple size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">Your own</span>
              <span className="mt-0.5 block text-[14px] text-ink-3">Tell your Myte exactly how to write.</span>
              {own.active ? (
                <span className="mt-1.5 block text-[13px] font-semibold text-signal-ink">Custom instructions on</span>
              ) : null}
            </span>
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
