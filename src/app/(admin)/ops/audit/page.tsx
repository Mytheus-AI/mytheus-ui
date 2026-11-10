import type { Metadata } from "next";
import { PageHeader } from "@/components/settings/primitives";
import { AuditLogViewer } from "@/components/ops/AuditLogViewer";
import { searchAuditLog } from "@/app/actions/ops";
import { loadOpsTenants } from "@/lib/api/admin-ops";

export const metadata: Metadata = { title: "Audit log | Mytheus" };
export const dynamic = "force-dynamic";

/* Audit-log viewer (plan 3.13 step 3): read-only `audit_logs` across tenants. Every read is
   itself logged by admin-ops-service, so opening this page leaves a trace by design. */
export default async function OpsAuditPage() {
  const [first, tenants] = await Promise.all([searchAuditLog(null, null), loadOpsTenants()]);
  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader title="Audit log" description="Who did what, in which tenant. Read only, and every read here is recorded in the ops audit log." />
      <AuditLogViewer
        tenants={tenants.kind === "live" ? tenants.data.map((t) => ({ org_id: t.org_id, name: t.name })) : []}
        initial={first.ok ? first.page : { error: first.message }}
      />
    </div>
  );
}
