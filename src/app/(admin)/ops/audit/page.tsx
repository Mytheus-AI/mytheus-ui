import type { Metadata } from "next";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
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
    <div className="flex flex-col gap-5">
      <SectionBar title="Audit log" context="Who did what in one tenant. Read only, and every search here is recorded in the ops audit log." />
      {tenants.kind === "live" ? (
        <AuditLogViewer tenants={tenants.data.tenants.map((t) => ({ org_id: t.org_id, name: t.name }))} />
      ) : (
        tenants.kind === "forbidden" ? (
          <Note tone="error">This account is not on the Mytheus staff list.</Note>
        ) : (
          <ErrorState title="The tenant list could not be loaded" text="There is nothing to pick until it loads. Nothing was changed." />
        )
      )}
    </div>
  );
}
