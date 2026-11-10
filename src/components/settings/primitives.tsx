import type { InputHTMLAttributes, ReactNode } from "react";
import { CheckCircle, Info, WarningCircle, WarningOctagon } from "@phosphor-icons/react/dist/ssr";

/* Shared building blocks for Settings, Billing, Org, the workspace admin console and the platform
   consoles (also borrowed by People, Ask and the collaboration log). Tokens only, so both themes
   work. The global `:focus-visible` rule sets a 6px radius on whatever has focus, so every shaped
   control here re-asserts its own radius with `focus-visible:!rounded-*`. */

/** Re-assert the 12px control radius while focused. */
export const focusPill = "focus-visible:!rounded-ctl";

/** Card padding, shared so every row, header and footer lines up on the same left edge. */
const padX = "px-4 sm:px-[22px]";

export const fieldClass =
  "h-11 w-full rounded-ctl border border-line-2 bg-surface px-3.5 text-[15px] text-ink " +
  "placeholder:text-ink-4 transition-[border-color,box-shadow] duration-150 hover:border-ink-4 " +
  "focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] focus-visible:outline-none " +
  "focus-visible:!rounded-ctl read-only:cursor-not-allowed read-only:bg-bg-2 read-only:text-ink-3 " +
  "read-only:hover:border-line-2";

/** Extra classes for the frozen `components/ui` Input when it sits in a settings row. */
export const inputClass =
  "focus-visible:!rounded-ctl read-only:cursor-not-allowed read-only:bg-bg-2 read-only:text-ink-3 read-only:hover:border-line-2";

/** Page title row: serif title, one line of context, the page's one primary action on the right. */
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
        <h1 className="display text-[28px] text-ink-display sm:text-[34px]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-3">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A white card with an optional title block. Rows inside it are separated by hairlines.
    `tone="danger"` is the separated card for destructive actions. */
export function SectionCard({
  title,
  description,
  aside,
  children,
  className = "",
  headingLevel = 3,
  headingId,
  tone = "default",
}: {
  title?: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 2 when the card sits straight under the page's h1 (no section title in between). */
  headingLevel?: 2 | 3;
  headingId?: string;
  tone?: "default" | "danger";
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const danger = tone === "danger";
  return (
    <section
      aria-labelledby={title && headingId ? headingId : undefined}
      className={`overflow-hidden rounded-card border bg-surface shadow-warm-1 ${
        danger ? "border-[color:color-mix(in_srgb,var(--priority-high)_35%,var(--line))]" : "border-line"
      } ${className}`}
    >
      {title ? (
        <div className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 pb-4 pt-[18px] ${padX}`}>
          <div className="min-w-0">
            <Heading
              id={headingId}
              className={`text-[17px] font-semibold leading-snug ${danger ? "text-priority-high" : "text-ink"}`}
            >
              {title}
            </Heading>
            {description ? (
              <p className="mt-1 max-w-[64ch] text-[14px] leading-relaxed text-ink-3">{description}</p>
            ) : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      ) : null}
      <div
        className={`divide-y ${
          danger ? "divide-[color:color-mix(in_srgb,var(--priority-high)_18%,var(--line))]" : "divide-line"
        } ${title ? `border-t ${danger ? "border-[color:color-mix(in_srgb,var(--priority-high)_18%,var(--line))]" : "border-line"}` : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

/** Label and help on the left, control on the right from md up; stacked below. */
export function SettingsRow({
  label,
  help,
  htmlFor,
  labelId,
  children,
}: {
  label: string;
  help?: ReactNode;
  htmlFor?: string;
  /** id for the label text, for a control that names itself with aria-labelledby */
  labelId?: string;
  children: ReactNode;
}) {
  const Label = htmlFor ? "label" : "div";
  return (
    <div
      className={`grid gap-2.5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,340px)] md:gap-x-8 md:py-[18px] ${padX}`}
    >
      <Label {...(htmlFor ? { htmlFor } : {})} className="block min-w-0">
        <span id={labelId} className="block text-[15px] font-semibold text-ink">
          {label}
        </span>
        {help ? (
          <span className="mt-0.5 block max-w-[56ch] text-[14px] leading-relaxed text-ink-3">{help}</span>
        ) : null}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A row whose control is a compact trailing element, such as a switch, a chip or a button.
    Wraps the control under the label when the row runs out of room. */
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
    <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4 md:py-[18px] ${padX}`}>
      <div className="min-w-0 flex-[1_1_16rem]">
        <span id={labelId} className="block text-[15px] font-semibold text-ink">
          {label}
        </span>
        {help ? (
          <span className="mt-0.5 block max-w-[56ch] text-[14px] leading-relaxed text-ink-3">{help}</span>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** A plain row of explanation inside a card: an icon tile, a title, one or two sentences. */
export function InfoRow({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3.5 py-4 md:py-[18px] ${padX}`}>
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

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}

/** Quiet inline message. `warning` and `error` use the frozen priority colours, `success` the ok green. */
export function Note({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "warning" | "error" | "success";
  children: ReactNode;
  className?: string;
}) {
  const toneClass = {
    info: "bg-bg-2 text-ink-2",
    warning: "bg-priority-medium-soft text-priority-medium",
    error: "bg-priority-high-soft text-priority-high",
    success: "bg-ok-soft text-ok",
  }[tone];
  const Icon = { info: Info, warning: WarningCircle, error: WarningOctagon, success: CheckCircle }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-2.5 rounded-ctl px-3.5 py-3 text-[14px] leading-relaxed ${toneClass} ${className}`}
    >
      <Icon size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** The live line next to a save button. Always mounted so screen readers hear each change; the
    message uses the button's own verb ("Save name" answers "Name saved."). */
export function SaveStatus({ tone, children }: { tone?: "ok" | "error"; children?: ReactNode }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`inline-flex min-h-[20px] items-center gap-1.5 text-[14px] font-medium ${
        tone === "error" ? "text-priority-high" : tone === "ok" ? "text-ok" : "text-ink-3"
      }`}
    >
      {children && tone === "ok" ? <CheckCircle size={16} weight="fill" aria-hidden="true" /> : null}
      {children && tone === "error" ? <WarningCircle size={16} weight="fill" aria-hidden="true" /> : null}
      {children}
    </p>
  );
}

/** Footer strip for forms: the primary action first, the status line next to it. */
export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 bg-surface-2 py-3.5 ${padX}`}>{children}</div>
  );
}
