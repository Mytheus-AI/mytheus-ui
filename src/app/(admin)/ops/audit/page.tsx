import type { Metadata } from "next";
import { Note, PageHeader } from "@/components/settings/primitives";
import { AuditLogViewer } from "@/components/ops/AuditLogViewer";
import { loadOpsTenants } from "@/lib/api/admin-ops";

export const metadata: Metadata = { title: "Audit log | Mytheus" };
export const dynamic = "force-dynamic";

/* Audit-log viewer (plan 3.13 step 3): read-only `audit_logs`, one tenant at a time (the service
   requires a tenant per search). Nothing is read until a tenant is picked; every read is itself
   logged by admin-ops-service, so each search leaves a trace by design. */
export default async function OpsAuditPage() {
  const tenants = await loadOpsTenants();
  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader title="Audit log" description="Who did what in one tenant. Read only, and every search here is recorded in the ops audit log." />
      {tenants.kind === "live" ? (
        <AuditLogViewer tenants={tenants.data.tenants.map((t) => ({ org_id: t.org_id, name: t.name }))} />
      ) : (
        <Note tone={tenants.kind === "forbidden" ? "error" : "warning"}>
          {tenants.kind === "forbidden"
            ? "This account is not on the Mytheus staff list."
            : "The tenant list could not be loaded just now, so there is nothing to pick. Try again in a moment."}
        </Note>
      )}
    </div>
  );
}
