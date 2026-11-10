import type { Metadata } from "next";
import { VocabularyEditor } from "@/components/org-brain/VocabularyEditor";
import { BrainSectionHead, LoadFailed, ReadOnlyNote } from "@/components/org-brain/parts";
import { fetchGlossary } from "@/lib/api/org-brain";
import { resolveOrgContext } from "@/lib/api/org-context";

export const metadata: Metadata = { title: "Vocabulary | Mytheus" };

/* Vocabulary (ADR-0039 A2, D1), `GET /api/v1/org/glossary`. */
export default async function VocabularyPage() {
  const [ctx, glossary] = await Promise.all([resolveOrgContext(), fetchGlossary()]);
  const canEdit = ctx?.user.role === "admin";
  return (
    <section aria-label="Vocabulary">
      <BrainSectionHead
        title="Vocabulary"
        lead="The words an outsider would not know: product names, codenames, acronyms, customers. Agents understand them, and live captions learn to spell them."
      />
      {!canEdit ? (
        <div className="mb-4">
          <ReadOnlyNote />
        </div>
      ) : null}
      {glossary.ok ? <VocabularyEditor initial={glossary.data} canEdit={canEdit} /> : <LoadFailed what="The vocabulary" />}
    </section>
  );
}
