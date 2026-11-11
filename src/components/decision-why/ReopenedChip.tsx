import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { Chip } from "@/components/ui/Chip";
import type { DecisionWhy, Load } from "@/lib/api/why-blast-types";
import { dayLabel } from "@/lib/decision-why";

/* The decision page's context line when a broken reason reopened the decision: amber, attention.
   Server-rendered with the page; null when the decision was not reopened or the read failed. */
export function ReopenedChip({ why }: { why: Load<DecisionWhy> }) {
  if (!why.ok || !why.data.reopened) return null;
  const at = dayLabel(why.data.reopened.at);
  return (
    <Chip tone="medium" icon={<ArrowCounterClockwise size={14} weight="bold" />}>
      Reopened{at ? ` ${at}` : ""}
    </Chip>
  );
}

/** True when the page should show the reopened chip instead of Confirmed. */
export function isReopened(why: Load<DecisionWhy>): boolean {
  return why.ok && why.data.reopened !== null;
}
