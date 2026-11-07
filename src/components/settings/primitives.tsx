import type { InputHTMLAttributes, ReactNode } from "react";
import { Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";

/* Shared building blocks for Settings, Billing, Org, Admin and Ops. They read the scoped theme
   tokens only (never raw hex), so both themes work. `.mx-app :focus-visible` forces an 8px radius
   on focus, so every shaped control re-asserts its own radius with `focus-visible:!rounded-*`. */

export const focusPill = "focus-visible:!rounded-pill";

export const fieldClass =
  "h-11 w-full rounded-pill border border-line-2 bg-surface px-3.5 text-[14px] text-ink " +
  "placeholder:text-ink-3 transition-colors hover:border-ink-3 focus-visible:border-signal " +
  "focus-visible:!rounded-pill read-only:cursor-not-allowed read-only:bg-bg-2 read-only:text-ink-3";

/** Page title in the shared header pattern: serif display title with a plain sub line. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="display text-[clamp(1.9rem,3.4vw,2.5rem)] text-ink-display">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-[62ch] text-[14.5px] text-ink-3">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A white card with an optional title block. Rows inside it are separated by hairlines. */
export function SectionCard({
  title,
  description,
  aside,
  children,
  className = "",
}: {
  title?: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-card border border-line bg-surface shadow-sm ${className}`}
    >
      {title ? (
        <div className="flex items-start justify-between gap-4 px-4 pb-1 pt-4 sm:px-[22px] sm:pt-[18px]">
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
            {description ? <p className="mt-0.5 text-[13.5px] text-ink-3">{description}</p> : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      ) : null}
      <div className={title ? "mt-3.5 divide-y divide-line border-t border-line" : "divide-y divide-line"}>
        {children}
      </div>
    </section>
  );
}

/** Label and help on the left, control on the right. Stacks under the sm breakpoint. */
export function SettingsRow({
  label,
  help,
  htmlFor,
  children,
}: {
  label: string;
  help?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  const Label = htmlFor ? "label" : "div";
  return (
    <div className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] sm:gap-x-7 sm:px-[22px] sm:py-[18px]">
      <Label {...(htmlFor ? { htmlFor } : {})} className="block min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{label}</span>
        {help ? <span className="mt-0.5 block max-w-[56ch] text-[12.5px] text-ink-3">{help}</span> : null}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A row whose control is a compact trailing element, such as a switch or a button. */
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
    <div className="flex items-center justify-between gap-6 px-4 py-4 sm:px-[22px] sm:py-[18px]">
      <div className="min-w-0">
        <span id={labelId} className="block text-[14px] font-semibold text-ink">
          {label}
        </span>
        {help ? <span className="mt-0.5 block max-w-[56ch] text-[12.5px] text-ink-3">{help}</span> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}

/** Quiet inline message. `warning` and `error` use the frozen priority colours. */
export function Note({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "warning" | "error";
  children: ReactNode;
  className?: string;
}) {
  const toneClass = {
    info: "bg-bg-2 text-ink-2",
    warning: "bg-priority-medium-soft text-priority-medium",
    error: "bg-priority-high-soft text-priority-high",
  }[tone];
  const Icon = tone === "info" ? Info : WarningCircle;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-2.5 rounded-pill px-3.5 py-3 text-[13.5px] ${toneClass} ${className}`}
    >
      <Icon size={18} weight="fill" className="mt-px shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Footer strip for forms: the primary action on the left, status text next to it. */
export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-[22px]">{children}</div>
  );
}
