"use client";

import type { ReactNode } from "react";
import { Dropdown } from "./Dropdown";

/* The compact themed select for toolbars and filters (a pill), kept for the pages that already
   use it. It is the shared Dropdown with a round trigger; new code can use Dropdown directly. */

export type SelectOption<T extends string> = { value: T; label: string; icon?: ReactNode; description?: string; disabled?: boolean };

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  className = "",
  size = "md",
  align = "left",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  /** accessible name; not rendered */
  label: string;
  className?: string;
  size?: "sm" | "md";
  align?: "left" | "right";
}) {
  return (
    <Dropdown
      value={value}
      onChange={onChange}
      options={options}
      label={label}
      className={className}
      size={size}
      shape="round"
      align={align === "right" ? "end" : "start"}
    />
  );
}
