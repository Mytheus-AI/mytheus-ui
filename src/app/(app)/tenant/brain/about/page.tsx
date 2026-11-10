import type { Metadata } from "next";
import { AboutEditor } from "@/components/org-brain/AboutEditor";
import { BrainSectionHead, LoadFailed, ReadOnlyNote } from "@/components/org-brain/parts";
import { fetchOrgProfile } from "@/lib/api/org-brain";
import { resolveOrgContext } from "@/lib/api/org-context";

export const metadata: Metadata = { title: "About the company | Mytheus" };

/* About the company (ADR-0039 A1), `GET /api/v1/org/profile`. */
export default async function AboutPage() {
  const [ctx, profile] = await Promise.all([resolveOrgContext(), fetchOrgProfile()]);
  const canEdit = ctx?.user.role === "admin";
  return (
    <section aria-label="About the company">
      <BrainSectionHead
        title="About the company"
        lead="A few plain sentences on what the company does and for whom. Every agent reads this before it listens to a meeting."
      />
      {!canEdit ? <ReadOnlyNote /> : null}
      {profile.ok ? (
        <div className={canEdit ? "" : "mt-4"}>
          <AboutEditor initial={profile.data} canEdit={canEdit} />
        </div>
      ) : (
        <LoadFailed what="The company profile" />
      )}
    </section>
  );
}
