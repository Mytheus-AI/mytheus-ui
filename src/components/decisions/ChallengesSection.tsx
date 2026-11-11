import { ChallengesLocked, ChallengesUnavailable } from "@/components/decisions/ChallengesStates";
import { DecisionChallenges } from "@/components/decisions/DecisionChallenges";
import { readDecisionChallenges } from "@/lib/api/decision-challenges";
import { isUuid } from "@/lib/decision-challenges";

/* The decision page's "Challenged in N places" section, streamed on its own (Suspense) so the
   lineage never waits for it. Three states besides the live one: a failed read (Retry re-runs the
   page's reads), a decision whose challenges the viewer may not see (404 from core-api, any
   tenant), and loading (all three in ChallengesStates.tsx). */

export async function ChallengesSection({
  decisionId,
  meetingId,
  superseded,
  focusReopenId,
}: {
  decisionId: string;
  meetingId: string;
  superseded: boolean;
  focusReopenId?: string | null;
}) {
  const read = await readDecisionChallenges(decisionId);
  if (read.kind === "unavailable") return <ChallengesUnavailable />;
  if (read.kind === "not-found") return <ChallengesLocked />;
  return (
    <DecisionChallenges
      data={read.data}
      decisionId={decisionId}
      meetingId={meetingId}
      superseded={superseded}
      focusReopenId={focusReopenId && isUuid(focusReopenId) ? focusReopenId.toLowerCase() : null}
      nowIso={new Date().toISOString()}
    />
  );
}
