import type { Metadata } from "next";
import { GroundRulesEditor } from "@/components/org-brain/GroundRulesEditor";
import { BrainSectionHead, LoadFailed, ReadOnlyNote } from "@/components/org-brain/parts";
import { fetchGroundRules } from "@/lib/api/org-brain";
import { resolveOrgContext } from "@/lib/api/org-context";

export const metadata: Metadata = { title: "Ground rules | Mytheus" };

/* Ground rules (ADR-0039 A5, C2), `GET /api/v1/org/ground-rules`. */
export default async function GroundRulesPage() {
  const [ctx, rules] = await Promise.all([resolveOrgContext(), fetchGroundRules()]);
  const canEdit = ctx?.user.role === "admin";
  return (
    <section aria-label="Ground rules">
      <BrainSectionHead
        title="Ground rules"
        lead="Topics agents must leave alone: no notes, no suggestions, no actions from a stretch of a meeting that is mainly about one of them."
      />
      {!canEdit ? (
        <div className="mb-4">
          <ReadOnlyNote />
        </div>
      ) : null}
      {rules.ok ? <GroundRulesEditor initial={rules.data.never_record_topics} canEdit={canEdit} /> : <LoadFailed what="The ground rules" />}
    </section>
  );
}
