"use client";

import { useClerk } from "@clerk/nextjs";
import type { ReactNode, TextareaHTMLAttributes } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { ChipInput } from "@/components/settings/ChipInput";
import { TextButton } from "@/components/auth/fields";

/* Onboarding form atoms in the auth look: label above, 12px corners, coral focus ring, an
   announced error tied to its field. They add the two controls the sign-up atoms lack, a
   multi-line field with a character count and a chip list. */

const labelClass = "mb-1.5 block text-[14px] font-semibold text-ink";

/** The message line under a field: the error when there is one, otherwise the hint. */
function FieldMessage({ id, error, hint }: { id: string; error?: string | null; hint?: ReactNode }) {
  if (error)
    return (
      <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-priority-high">
        <WarningCircle size={15} weight="bold" className="mt-px shrink-0" aria-hidden />
        {error}
      </p>
    );
  if (hint)
    return (
      <div id={id} className="mt-1.5 text-[13px] leading-snug text-ink-3">
        {hint}
      </div>
    );
  return null;
}

/** "120 of 1000", turning red past the limit. */
export function CharCount({ length, max, min }: { length: number; max: number; min?: number }) {
  const over = length > max;
  const under = min !== undefined && length > 0 && length < min;
  return (
    <span aria-hidden className={`shrink-0 tabular-nums ${over ? "text-priority-high" : under ? "text-ink-2" : "text-ink-3"}`}>
      {length} of {max}
    </span>
  );
}

export function AreaField({
  id,
  label,
  optional,
  error,
  hint,
  max,
  min,
  value,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value"> & {
  id: string;
  label: string;
  optional?: boolean;
  error?: string | null;
  hint?: ReactNode;
  max: number;
  min?: number;
  value: string;
}) {
  const msgId = `${id}-msg`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          {label}
          {optional ? <span className="font-normal text-ink-3"> (optional)</span> : null}
        </label>
        <span className="text-[13px]">
          <CharCount length={value.trim().length} max={max} min={min} />
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        className={`block w-full resize-y rounded-ctl border bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] duration-150 hover:border-ink-4 focus-visible:!rounded-ctl focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] focus-visible:outline-none ${
          error ? "!border-priority-high" : "border-line-2"
        }`}
        {...rest}
      />
      <FieldMessage id={msgId} error={error} hint={hint} />
    </div>
  );
}

export function ChipField({
  id,
  label,
  optional,
  error,
  hint,
  value,
  onChange,
  max,
  placeholder,
  noun,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string | null;
  hint?: ReactNode;
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  placeholder?: string;
  noun?: string;
}) {
  const msgId = `${id}-msg`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          {label}
          {optional ? <span className="font-normal text-ink-3"> (optional)</span> : null}
        </label>
        <span aria-hidden className="shrink-0 text-[13px] tabular-nums text-ink-3">
          {value.length} of {max}
        </span>
      </div>
      <ChipInput
        id={id}
        value={value}
        onChange={onChange}
        max={max}
        placeholder={placeholder}
        describedBy={error || hint ? msgId : undefined}
        invalid={!!error}
        noun={noun}
      />
      <FieldMessage id={msgId} error={error} hint={hint} />
    </div>
  );
}

/** Top right of the onboarding pages: who is signed in, and the way out. */
export function OnboardingAside({ email }: { email: string }) {
  const clerk = useClerk();
  return (
    <span className="inline-flex items-center justify-end gap-x-3">
      {email ? <span className="hidden max-w-[24ch] truncate sm:inline">{email}</span> : null}
      <TextButton onClick={() => void clerk.signOut({ redirectUrl: "/sign-in" })}>Sign out</TextButton>
    </span>
  );
}
