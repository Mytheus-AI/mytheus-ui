import Link from "next/link";
import { ArrowRight, CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import { fixFor, type Readiness } from "@/lib/api/org-brain-types";

/* The readiness meter (ADR-0039 A7): how much of the company brain is filled in, and the check
   that fixes each gap. The one coral line runs through a bead per check, done checks first, so
   the line's reach is the progress; the checklist under it is the accessible version and each
   open check links to the page that fixes it. Server component, no state. */

/** The bead line. Decorative: the checklist says the same thing in words. */
export function BeadLine({ done, total, className = "" }: { done: number; total: number; className?: string }) {
  const n = Math.max(total, 1);
  const pos = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * 100);
  const reach = done > 0 ? pos(done - 1) : 0;
  return (
    <div aria-hidden className={`relative h-6 ${className}`}>
      <div className="absolute inset-x-[9px] top-1/2 -translate-y-1/2">
        <div className="relative h-[2.5px]">
          <div className="absolute inset-0 rounded-full bg-line-2" />
          <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--signal-line)]" style={{ width: `${reach}%` }} />
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className={`absolute top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full ${
                i < done
                  ? "bg-signal shadow-[0_0_0_4px_var(--signal-soft)]"
                  : "border-2 border-line-2 bg-surface"
              }`}
              style={{ left: `${pos(i)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function summary(r: Readiness): string {
  const done = r.checks.filter((c) => c.done).length;
  if (r.checks.length && done === r.checks.length) return "Every check is done. Agents bring all of this into every meeting.";
  if (done === 0) return "Nothing yet. Agents start using each piece from the next meeting on.";
  return `${done} of ${r.checks.length} checks done. Agents already use what is here.`;
}

export function ReadinessMeter({
  readiness,
  headingLevel = 2,
  title = "How ready your agents are",
  id = "readiness",
  linkFixes = true,
}: {
  readiness: Readiness | null;
  headingLevel?: 2 | 3;
  title?: string;
  id?: string;
  /** off where leaving the page would lose work (it is never off today; kept for the setup) */
  linkFixes?: boolean;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  if (!readiness)
    return (
      <section aria-labelledby={`${id}-h`} className="rounded-card border border-line bg-surface p-5 shadow-warm-1 sm:p-6">
        <H id={`${id}-h`} className="display text-[22px] text-ink">
          {title}
        </H>
        <p className="mt-2 text-[15px] text-ink-3">The readiness checks could not be loaded just now. Reload the page to try again.</p>
      </section>
    );

  const ordered = [...readiness.checks].sort((a, b) => Number(b.done) - Number(a.done));
  const done = ordered.filter((c) => c.done).length;

  return (
    <section aria-labelledby={`${id}-h`} className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <div className="grid gap-x-10 gap-y-5 px-5 pb-6 pt-5 sm:px-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-end">
        <div className="min-w-0">
          <H id={`${id}-h`} className="text-[15px] font-semibold text-ink-3">
            {title}
          </H>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="display text-[56px] leading-none tabular-nums text-ink">{readiness.score}</span>
            <span className="text-[16px] font-medium text-ink-3">of 100</span>
          </p>
        </div>
        <div className="min-w-0">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{summary(readiness)}</p>
          <BeadLine done={done} total={ordered.length} className="mt-4" />
        </div>
      </div>

      <ul className="grid gap-px border-t border-line bg-line md:grid-cols-2 xl:grid-cols-3" aria-label="Readiness checks">
        {ordered.map((c) => {
          const fix = fixFor(c.key);
          return (
            <li
              key={c.key}
              className="flex min-w-0 items-start gap-3 bg-surface px-5 py-4 sm:px-6"
            >
              {c.done ? (
                <CheckCircle size={22} weight="fill" className="mt-px shrink-0 text-ok" aria-hidden />
              ) : (
                <Circle size={22} className="mt-px shrink-0 text-ink-4" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">
                  {c.label}
                  <span className="sr-only">{c.done ? ", done" : ", not done yet"}</span>
                </p>
                {c.detail ? <p className="mt-0.5 text-[14px] leading-snug text-ink-3">{c.detail}</p> : null}
                {!c.done && linkFixes ? (
                  <Link
                    href={fix.href}
                    className="group mt-2 inline-flex min-h-[32px] items-center gap-1.5 rounded-ctl text-[14px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal"
                  >
                    {fix.action}
                    <ArrowRight size={14} aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One row: the score, the bead line and a link. For the workspace admin home and the dashboard. */
export function ReadinessStrip({
  readiness,
  href = "/tenant/brain",
  linkLabel = "Open the company brain",
}: {
  readiness: Readiness;
  href?: string;
  linkLabel?: string;
}) {
  const done = readiness.checks.filter((c) => c.done).length;
  const next = readiness.checks.find((c) => !c.done);
  return (
    <div className="grid items-center gap-x-6 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <p className="flex items-baseline gap-1.5">
        <span className="display text-[40px] leading-none tabular-nums text-ink">{readiness.score}</span>
        <span className="text-[14px] font-medium text-ink-3">of 100</span>
      </p>
      <div className="min-w-0">
        <BeadLine done={done} total={readiness.checks.length} />
        <p className="mt-1.5 truncate text-[14px] text-ink-3">
          {next ? (
            <>
              Next: <span className="font-medium text-ink-2">{next.label}</span>
              {next.detail ? `. ${next.detail}` : ""}
            </>
          ) : (
            "Every check is done."
          )}
        </p>
      </div>
      <Link
        href={next ? fixFor(next.key).href : href}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-ctl border border-line-2 bg-surface px-4 text-[14px] font-semibold text-ink transition-colors duration-150 hover:bg-surface-2 focus-visible:!rounded-ctl"
      >
        {next ? fixFor(next.key).action : linkLabel}
      </Link>
    </div>
  );
}
