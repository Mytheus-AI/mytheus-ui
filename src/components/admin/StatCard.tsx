import type { ReactNode } from "react";

/* One headline number in the shared card language: a plain label, the figure in the serif
   (the number is the point), and an optional quiet line of context under it. */
export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-surface px-5 py-4 shadow-warm-1">
      <p className="kicker truncate">{label}</p>
      <p className="display mt-2 truncate text-[30px] leading-none tabular-nums text-ink-display sm:text-[34px]">
        {value}
      </p>
      {hint ? <p className="mt-2 truncate text-[13px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

/** Table head cell: sentence case on the raised head row, never tracked capitals. */
export const thClass = "px-5 py-2.5 text-left text-[13px] font-semibold text-ink-3";

/** The head row itself. */
export const theadRowClass = "border-b border-line bg-surface-2";
