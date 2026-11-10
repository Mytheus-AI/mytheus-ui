import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { WarningCircle } from "@phosphor-icons/react/ssr";
import { cardPadX } from "./Card";

/* Form rows for settings-style cards (formerly settings/primitives and the brain's ui): a row with
   the label and help on the left and the control on the right from md up, a compact inline row
   for a switch or a button, an explanation row, the field styles, the message under a field and a
   character count. Saves report through toasts (`@/lib/toast`), never a status line. */

export const fieldClass =
  "h-11 w-full rounded-ctl border border-line-2 bg-surface px-3.5 text-[15px] text-ink " +
  "placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 hover:border-ink-4 " +
  "focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] " +
  "read-only:cursor-not-allowed read-only:bg-bg-2 read-only:text-ink-3 read-only:hover:border-line-2 " +
  "aria-[invalid=true]:border-priority-high disabled:opacity-60";

export const textareaClass =
  "block w-full resize-none rounded-ctl border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink " +
  "placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 hover:border-ink-4 " +
  "focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] aria-[invalid=true]:border-priority-high";

/** Extra classes for the shared `Input` when it sits in a settings row (read-only look). */
export const inputClass = "read-only:cursor-not-allowed read-only:bg-bg-2 read-only:text-ink-3 read-only:hover:border-line-2";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`${textareaClass} ${className}`} {...rest} />;
}

/** Label and help on the left, control on the right from md up; stacked below. */
export function FieldRow({
  label,
  help,
  htmlFor,
  labelId,
  children,
}: {
  label: string;
  help?: ReactNode;
  htmlFor?: string;
  labelId?: string;
  children: ReactNode;
}) {
  const Label = htmlFor ? "label" : "div";
  return (
    <div className={`grid gap-2.5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,340px)] md:gap-x-8 md:py-[18px] ${cardPadX}`}>
      <Label {...(htmlFor ? { htmlFor } : {})} className="block min-w-0">
        <span id={labelId} className="block text-[15px] font-semibold text-ink">
          {label}
        </span>
        {help ? <span className="mt-0.5 block max-w-[56ch] text-[14px] leading-relaxed text-ink-3">{help}</span> : null}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A row whose control is a compact trailing element (a switch, a chip, a button). */
export function InlineRow({
  label,
  help,
  labelId,
  children,
}: {
  label: string;
  help?: ReactNode;
  labelId?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4 md:py-[18px] ${cardPadX}`}>
      <div className="min-w-0 flex-[1_1_16rem]">
        <span id={labelId} className="block text-[15px] font-semibold text-ink">
          {label}
        </span>
        {help ? <span className="mt-0.5 block max-w-[56ch] text-[14px] leading-relaxed text-ink-3">{help}</span> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** A plain row of explanation inside a card: an icon tile, a title, one or two sentences. */
export function InfoRow({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className={`flex items-start gap-3.5 py-4 md:py-[18px] ${cardPadX}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        {children ? <div className="mt-0.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-3">{children}</div> : null}
      </div>
    </div>
  );
}

/** Rows of a flush card, divided by hairlines. */
export function Rows({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-line border-t border-line ${className}`}>{children}</div>;
}

/** The message under a field: the error, announced, or a quiet hint. */
export function FieldMsg({ id, error, hint }: { id: string; error?: string | null; hint?: ReactNode }) {
  if (error)
    return (
      <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[14px] leading-snug text-priority-high">
        <WarningCircle size={15} weight="bold" className="mt-px shrink-0" aria-hidden />
        {error}
      </p>
    );
  if (hint)
    return (
      <p id={id} className="mt-1.5 text-[14px] leading-snug text-ink-3">
        {hint}
      </p>
    );
  return null;
}

/** "120 of 2000", red past the limit. */
export function CharCount({ n, max, className = "" }: { n: number; max: number; className?: string }) {
  return (
    <span aria-hidden className={`shrink-0 text-[12.5px] tabular-nums ${n > max ? "text-priority-high" : "text-ink-3"} ${className}`}>
      {n} of {max}
    </span>
  );
}
