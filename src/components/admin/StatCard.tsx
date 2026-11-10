import type { ReactNode } from "react";
import { cardClass } from "@/components/ui/Card";

/* One headline number in the shared card: a plain label, the figure in the serif (the number is
   the point), and an optional quiet line of context under it. */
export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className={cardClass({ className: "min-w-0" })}>
      <p className="truncate text-[12.5px] font-semibold text-ink-3">{label}</p>
      <p className="display mt-2 truncate text-[30px] leading-none tabular-nums text-ink-display">{value}</p>
      {hint ? <p className="mt-2 truncate text-[12.5px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

/** Table head cell: sentence case on the raised head row, never tracked capitals. Tables that use
    it carry `mx-table` and `data-label` on their cells, so they stack under 640px. */
export const thClass = "px-5 py-2.5 text-left text-[12.5px] font-semibold text-ink-3";

/** The head row itself. */
export const theadRowClass = "border-b border-line bg-surface-2";
