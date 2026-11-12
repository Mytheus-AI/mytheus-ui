import type { Metadata } from "next";
import { GoalsEditor } from "@/components/org-brain/GoalsEditor";
import { BrainSectionHead, LoadFailed, ReadOnlyNote } from "@/components/org-brain/parts";
import { fetchGoals, fetchMemberOptions } from "@/lib/api/org-brain";
import { currentQuarter } from "@/lib/api/org-brain-types";
import { resolveOrgContext } from "@/lib/api/org-context";

export const metadata: Metadata = { title: "Goals | Mytheus" };

/* Goals (ADR-0039 A4, B3), `GET /api/v1/org/goals` and the member list. */
export default async function GoalsPage() {
  const [ctx, goals, members] = await Promise.all([resolveOrgContext(), fetchGoals(), fetchMemberOptions()]);
  const canEdit = ctx?.user.role === "admin";
  return (
    <section aria-label="Goals">
      <BrainSectionHead
        title="Goals"
        lead="What matters now, most important first. Hosts tie agenda items to a goal, and Mytes weigh what they keep against these."
      />
      {!canEdit ? (
        <div className="mb-4">
          <ReadOnlyNote />
        </div>
      ) : null}
      {goals.ok ? (
        <GoalsEditor initial={goals.data} members={members} canEdit={canEdit} defaultPeriod={currentQuarter(new Date())} />
      ) : (
        <LoadFailed what="The goals" />
      )}
    </section>
  );
}
