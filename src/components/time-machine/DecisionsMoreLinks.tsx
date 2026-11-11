import { ClockCounterClockwise, Target } from "@phosphor-icons/react";
import { LinkButton } from "@/components/ui/Button";

/* The two views built on the decision log ("Beyond the meeting", Layer 3), linked from its title
   row: the company as it stood on any date, and how good the workspace's calls turn out. */
export function DecisionsMoreLinks() {
  return (
    <nav aria-label="More about decisions" className="flex flex-wrap items-center gap-2">
      <LinkButton href="/decisions/time-machine" variant="outline" size="sm">
        <ClockCounterClockwise size={15} aria-hidden />
        Time machine
      </LinkButton>
      <LinkButton href="/decisions/calls" variant="outline" size="sm">
        <Target size={15} aria-hidden />
        How good are our calls
      </LinkButton>
    </nav>
  );
}
