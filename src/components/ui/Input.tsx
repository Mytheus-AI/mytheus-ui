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
        <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      ) : null}
      <input
        id={inputId}
        className={`w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-3 focus-visible:border-signal ${
          error ? "border-[#b3432f]" : ""
        } ${className}`}
        {...rest}
      />
      {error ? <span className="mt-1.5 block text-[12px] text-[#b3432f]">{error}</span> : null}
    </label>
  );
}
