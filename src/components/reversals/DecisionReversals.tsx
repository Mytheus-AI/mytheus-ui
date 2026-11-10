import { Suspense } from "react";
import { Note } from "@/components/ui/Note";
import { fetchDecisionReversal, fetchDecisionReversals } from "@/lib/api/decision-reversals";
import type { DecisionReversal } from "@/lib/api/only-mytheus-types";
import { isUuid, orderReversals } from "@/lib/reversals";
import { ReversalBanner } from "./ReversalBanner";

/* The tasks page's "decisions changed under your tasks" banner (only-Mytheus wave, contract
   section 1). Server component: reads the caller's pending reversals and, when the page was
   reached from a notification (`?reversal={id}`), that one too even if it is already settled, so
   the link always lands on something. It streams in on its own (Suspense), so the task list never
   waits for it; with nothing pending it renders nothing at all. */

export function DecisionReversals({ focusId }: { focusId?: string | null }) {
  return (
    <Suspense fallback={null}>
      <Reversals focusId={focusId && isUuid(focusId) ? focusId.toLowerCase() : null} />
    </Suspense>
  );
}

async function Reversals({ focusId }: { focusId: string | null }) {
  let items: DecisionReversal[];
  try {
    items = await fetchDecisionReversals("pending");
  } catch {
    return (
      <Note className="mb-5">
        We couldn&rsquo;t check whether any decision changed under your tasks just now. Your tasks below are up to date.
      </Note>
    );
  }
  if (focusId && !items.some((r) => r.id === focusId)) {
    const one = await fetchDecisionReversal(focusId).catch(() => null);
    if (one) items = [...items, one];
  }
  if (items.length === 0) return null;
  return <ReversalBanner items={orderReversals(items)} focusId={focusId} />;
}
