import type { ReactNode } from "react";

/* An empty view is an invitation to act: a short title that says what will appear here, one
   sentence on how to get it there, and the action. The drawn loop is the brand's line at rest. */

export function EmptyState({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-line-2 bg-surface-2/60 px-6 py-14 text-center ${className}`}
    >
      <svg viewBox="0 0 120 40" className="mb-4 h-8 w-24" aria-hidden>
        <path
          className="line-stroke"
          d="M4 30 C24 30 30 30 44 30 C62 30 72 6 60 6 C48 6 50 30 70 30 C86 30 96 30 116 30"
        />
      </svg>
      <p className="font-display text-[20px] font-medium leading-tight text-ink">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-ink-3">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
