import { notFound } from "next/navigation";
import { resolveOrgContext } from "@/lib/api/org-context";
import { TenantTabs } from "@/components/tenant/TenantTabs";

/* The tenant admin console (doc 20 section 7, Plan 10-13 section 3.14), for a workspace's own
   owners and admins.

   Deviation from doc 20, which files it as `(admin)/tenant`: it lives inside the `(app)` shell
   instead. `(admin)` here is the platform-staff surface (every tenant, ops), with its own
   header and no app nav; a workspace admin managing their own team belongs in the app they
   already use. The gate below is UX courtesy, per CLAUDE.md: the `/admin/tenant/*` API
   enforces the RBAC tier regardless. A non-admin gets a 404, not a 403, so the console's
   existence is not advertised. */
export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveOrgContext();
  if (!ctx || ctx.user.role !== "admin") notFound();

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
      <TenantTabs />
      {children}
    </div>
  );
}
