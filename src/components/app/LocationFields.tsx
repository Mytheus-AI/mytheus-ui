"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import { subdivisionsOf, type Place } from "@/lib/places";

/* Country, then state when the country has a list: the two fields the location prompt and the
   Location card in Settings > Profile share. Picking a new country clears the state. */

export function LocationFields({
  countries,
  country,
  subdivision,
  onChange,
  disabled = false,
  size = "md",
  idPrefix,
}: {
  countries: Place[];
  country: string | null;
  subdivision: string | null;
  onChange: (country: string | null, subdivision: string | null) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  idPrefix: string;
}) {
  const states = subdivisionsOf(country);
  return (
    <div className={`grid gap-3 ${states.length ? "sm:grid-cols-2" : ""}`}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-country`} className="text-[13px] font-semibold text-ink-2">
          Country
        </label>
        <Dropdown
          id={`${idPrefix}-country`}
          label="Country"
          value={country}
          onChange={(v) => onChange(v, null)}
          placeholder="Choose your country"
          options={countries.map((c) => ({ value: c.code, label: c.name }))}
          size={size}
          disabled={disabled}
        />
      </div>
      {states.length ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-state`} className="text-[13px] font-semibold text-ink-2">
            State
          </label>
          <Dropdown
            id={`${idPrefix}-state`}
            label="State"
            value={subdivision}
            onChange={(v) => onChange(country, v)}
            placeholder="Choose your state"
            options={states.map((s) => ({ value: s.code, label: s.name }))}
            size={size}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
