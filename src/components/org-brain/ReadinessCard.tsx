import { Suspense } from "react";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchReadiness } from "@/lib/api/org-brain";
import { ReadinessStrip } from "./ReadinessMeter";

/* The dashboard's company brain card (ADR-0039 Part E), for owners and admins only. It streams
   in on its own (Suspense, no fallback) so the readiness read never holds up the dashboard, and
   it stays away when there is nothing to do: a member, a read that failed (unknown is not the
   same as missing), or a brain where every check is done. */

export function ReadinessCard({ className = "mb-6" }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <Card className={className} />
    </Suspense>
  );
}

async function Card({ className }: { className: string }) {
  const ctx = await resolveOrgContext();
  if (ctx?.user.role !== "admin") return null;
  const readiness = await fetchReadiness();
  if (!readiness.ok || readiness.data.score >= 100 || readiness.data.checks.length === 0) return null;

  return (
    <section
      aria-labelledby="brain-readiness-card"
      className={`overflow-hidden rounded-card border border-line bg-surface px-[18px] py-4 shadow-warm-1 sm:px-[22px] ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="brain-readiness-card" className="text-[16px] font-semibold text-ink">
          How ready your agents are
        </h2>
        <p className="text-[13.5px] text-ink-3">The more they know about the company, the better they listen.</p>
      </div>
      <ReadinessStrip readiness={readiness.data} />
    </section>
  );
}
