import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { SectionCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { CardSkeleton } from "@/components/ui/Page";

/* The decision page's challenges section in its three non-live states: loading, a failed read
   (Retry re-runs the page's reads) and a decision whose challenges the viewer may not see. */

export function ChallengesSkeleton() {
  return (
    <div role="status" aria-label="Loading where this decision was challenged">
      <CardSkeleton rows={2} />
    </div>
  );
}

/** A failed read: the section says so and Retry re-runs the page's reads. */
export function ChallengesUnavailable() {
  return (
    <SectionCard title="Challenges" headingId="challenges-title">
      <ErrorState
        variant="inline"
        className="!pt-[18px]"
        title="We could not load where this decision was challenged"
        text="The decision itself is safe. This is usually a passing problem reaching the workspace."
      />
    </SectionCard>
  );
}

/** The viewer may not see them (core-api answered 404). */
export function ChallengesLocked() {
  return (
    <SectionCard title="Challenges" headingId="challenges-title">
      <div className="flex items-start gap-3.5 px-4 py-[18px] sm:px-[22px]">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-3">
          <LockSimple size={18} />
        </span>
        <p className="max-w-[60ch] text-[14px] leading-relaxed text-ink-3">
          Only people who were in this decision&apos;s meeting can see where it was challenged and ask to reopen it.
        </p>
      </div>
    </SectionCard>
  );
}
