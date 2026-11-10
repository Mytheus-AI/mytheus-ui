import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  error,
  className = "",
  id,
  ...rest
}: {
  label?: string;
  error?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label ? (
        <span className="mb-1.5 block text-[14px] font-semibold text-ink">{label}</span>
      ) : null}
      <input
        id={inputId}
        className={`h-11 w-full rounded-ctl border border-line-2 bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] hover:border-ink-4 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] focus-visible:outline-none ${
          error ? "border-priority-high" : ""
        } ${className}`}
        {...rest}
      />
      {error ? <span className="mt-1.5 block text-[13px] text-priority-high">{error}</span> : null}
    </label>
  );
}
