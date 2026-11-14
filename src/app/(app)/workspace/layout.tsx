import { notFound } from "next/navigation";
import { resolveOrgContext } from "@/lib/api/org-context";
import { Page, PageHead } from "@/components/ui/Page";
import { SectionTabs } from "@/components/app/SectionTabs";
import { OrgMark } from "@/components/tenant/OrgMark";

/* The Workspace console (doc 20 section 7), for a workspace's own owners and admins: one console
   with tabs (Overview, Members, Company brain, Usage and billing, Agent collaboration, Data and
   privacy, Support access). The company brain keeps its own sections as a secondary nav inside its
   tab.

   It lives inside the `(app)` shell rather than `(admin)`, which is the platform-staff surface. The
   gate is UX courtesy, per CLAUDE.md: the `/admin/tenant/*` API enforces the RBAC tier regardless.
   A non-admin gets a 404, not a 403, so the console's existence is not advertised, and no member
   is ever shown a link to it. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveOrgContext();
  if (!ctx || ctx.user.role !== "admin") notFound();

  return (
    <Page>
      <PageHead
        title={
          <span className="inline-flex items-center gap-3">
            {/* The workspace's own mark beside the console title (ADR-0048); the name is in the
                line under it, so the mark is decorative here. */}
            <OrgMark name={ctx.org.name} logoUrl={ctx.org.logoUrl} size={40} decorative />
            Workspace
          </span>
        }
        context={`Who is in ${ctx.org.name || "your workspace"}, what its Mytes know, what it uses, and how its data is kept.`} />
      <SectionTabs
        section="workspace"
        label="Workspace sections"
        exact={["/workspace"]}
        className="mb-6"
      />
      {children}
    </Page>
  );
}
