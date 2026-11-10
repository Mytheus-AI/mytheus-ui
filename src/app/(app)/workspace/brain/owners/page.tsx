import type { Metadata } from "next";
import { OwnersEditor } from "@/components/org-brain/OwnersEditor";
import { BrainSectionHead, LoadFailed, ReadOnlyNote } from "@/components/org-brain/parts";
import { fetchMemberOptions, fetchTopicOwners } from "@/lib/api/org-brain";
import { resolveOrgContext } from "@/lib/api/org-context";

export const metadata: Metadata = { title: "Who owns what | Mytheus" };

/* Who owns what (ADR-0039 A3, C4), `GET /api/v1/org/topic-owners` and the member list. */
export default async function OwnersPage() {
  const [ctx, owners, members] = await Promise.all([resolveOrgContext(), fetchTopicOwners(), fetchMemberOptions()]);
  const canEdit = ctx?.user.role === "admin";
  return (
    <section aria-label="Who owns what">
      <BrainSectionHead
        title="Who owns what"
        lead="A topic and the one person who owns it. Agents suggest them as the owner of a new action and as the person to ask."
      />
      {!canEdit ? (
        <div className="mb-4">
          <ReadOnlyNote />
        </div>
      ) : null}
      {owners.ok ? <OwnersEditor initial={owners.data} members={members} canEdit={canEdit} /> : <LoadFailed what="Who owns what" />}
    </section>
  );
}
