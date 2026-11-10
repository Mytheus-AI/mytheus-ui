import type { Metadata } from "next";
import { MeetingTypesEditor } from "@/components/org-brain/MeetingTypesEditor";
import { BrainSectionHead, LoadFailed, ReadOnlyNote } from "@/components/org-brain/parts";
import { fetchMeetingTemplates } from "@/lib/api/org-brain";
import { resolveOrgContext } from "@/lib/api/org-context";

export const metadata: Metadata = { title: "Meeting types | Mytheus" };

/* Meeting types (ADR-0039 B1, B2), `GET /api/v1/meeting-templates` on core-api. */
export default async function MeetingTypesPage() {
  const [ctx, templates] = await Promise.all([resolveOrgContext(), fetchMeetingTemplates()]);
  const canEdit = ctx?.user.role === "admin";
  return (
    <section aria-label="Meeting types">
      <BrainSectionHead
        title="Meeting types"
        lead="The meetings the company runs often, with their usual length and agenda. A host picks one on New meeting and starts from it."
      />
      {!canEdit ? (
        <div className="mb-4">
          <ReadOnlyNote />
        </div>
      ) : null}
      {templates.ok ? <MeetingTypesEditor initial={templates.data} canEdit={canEdit} /> : <LoadFailed what="The meeting types" />}
    </section>
  );
}
