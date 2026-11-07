import type { ReactNode } from "react";

/* One headline number in the shared card language: small label, serif figure. */
export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface px-5 py-4 shadow-sm">
      <p className="text-[13px] font-semibold text-ink-3">{label}</p>
      <p className="display mt-1.5 text-[32px] tabular-nums text-ink-display">{value}</p>
    </div>
  );
}

export const thClass =
  "px-5 py-3 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3";
