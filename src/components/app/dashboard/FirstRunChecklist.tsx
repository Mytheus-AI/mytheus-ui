import { Check } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { CardHead, cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { TextLink } from "@/components/ui/TextLink";
import { checklistProgress, type ChecklistStep } from "@/lib/checklist";

/* Home's first-run checklist (one card instead of the three stacked onboarding banners). The
   steps sit on the memory line: a hairline that turns coral through every step that is done, so
   the line visibly advances as each completes. The current step (the first still to do) carries
   the one dark button; later steps are quiet links; done steps say so. Hidden once nothing is
   left to do (`lib/checklist.ts`, tested).

   From lg up the steps run across in one row with the line between the beads; below lg they stack
   with the line running down the left. Server component: the page reads every signal in its main
   request, so the card never pops in and pushes the page down. */

const COLS: Record<number, string> = { 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" };

export function FirstRunChecklist({ steps, welcomeHref = null }: { steps: ChecklistStep[]; welcomeHref?: string | null }) {
  const progress = checklistProgress(steps);
  if (!progress.visible) return null;
  let lastDone = -1;
  steps.forEach((s, i) => {
    if (s.state === "done") lastDone = i;
  });

  return (
    <section aria-labelledby="first-run-title" className={cardClass({ flush: true, className: "mb-6" })}>
      <CardHead
        id="first-run-title"
        title="Get set up"
        caption={`${progress.done} of ${progress.total} done`}
        right={welcomeHref ? <TextLink href={welcomeHref}>Read your welcome brief</TextLink> : undefined}
      />
      <ol className={`grid grid-cols-1 px-4 pb-5 pt-1 sm:px-[22px] lg:gap-x-4 ${COLS[steps.length] ?? "lg:grid-cols-5"}`}>
        {steps.map((step, i) => {
          const done = step.state === "done";
          const current = step.key === progress.current;
          // The stretch of line leaving this step is coral when the line has already run past it.
          const lit = i < lastDone;
          const last = i === steps.length - 1;
          return (
            <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0 lg:flex-col lg:gap-3 lg:pb-0">
              {!last ? (
                <span
                  aria-hidden
                  className={`absolute left-[13px] top-8 h-[calc(100%-28px)] w-[2px] rounded-full lg:left-9 lg:top-[13px] lg:h-[2px] lg:w-[calc(100%-20px)] ${
                    lit ? "bg-[var(--signal-line)]" : "bg-line-2"
                  }`}
                />
              ) : null}
              <span
                aria-hidden
                className={`relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  done
                    ? "bg-signal text-pill-on"
                    : current
                      ? "border-2 border-signal bg-surface ring-4 ring-signal-soft"
                      : step.state === "unknown"
                        ? "border-2 border-dashed border-line-2 bg-surface"
                        : "border-2 border-line-2 bg-surface"
                }`}
              >
                {done ? <Check size={14} weight="bold" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className={`text-[15px] font-semibold leading-snug ${done ? "text-ink-3" : "text-ink"}`}>
                  {step.title}
                  <span className="sr-only">{done ? " (done)" : current ? " (next)" : step.state === "unknown" ? "" : " (to do)"}</span>
                </h3>
                {!done ? <p className="mt-1 max-w-[40ch] text-[14px] leading-relaxed text-ink-3">{step.text}</p> : null}
                <div className="mt-2.5">
                  {done ? (
                    <Chip tone="ok" icon={<Check size={12} weight="bold" />}>
                      Done
                    </Chip>
                  ) : current ? (
                    <LinkButton href={step.href} size="sm">
                      {step.action}
                    </LinkButton>
                  ) : step.state === "todo" ? (
                    <TextLink href={step.href}>{step.action}</TextLink>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
