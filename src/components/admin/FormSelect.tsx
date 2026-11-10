"use client";

import { useState } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";

/* The themed `Select` inside a server-action form: the choice rides along as a hidden input. */
export function FormSelect<T extends string>({
  name,
  defaultValue,
  options,
  label,
  size = "sm",
  className,
}: {
  name: string;
  defaultValue: T;
  options: SelectOption<T>[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [value, setValue] = useState<T>(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onChange={setValue} options={options} label={label} size={size} className={className} />
    </>
  );
}
