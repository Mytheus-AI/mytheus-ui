"use client";

import { useId } from "react";
import { Dropdown } from "@/components/ui/Dropdown";

/* The pre-join's device field: a visible label over the shared Dropdown. Options carry a value (a
   device id) and a label. With a single option or `disabled` it is a read-only field rather than
   an empty menu. `openUp` is kept for callers; the dropdown now flips by itself. */

export type SelectOption = { value: string; label: string };

export function Select({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  openUp?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];
  const inert = disabled || options.length < 2;
  return (
    <div className="select">
      <label className="select-label" htmlFor={id}>
        {label}
      </label>
      <Dropdown
        id={id}
        label={label}
        value={selected?.value ?? null}
        onChange={(v) => onChange?.(v)}
        options={options}
        disabled={inert}
        placeholder="None"
      />
    </div>
  );
}
