import type { Metadata } from "next";
import { StatCard } from "@/components/admin/StatCard";
import { Note, PageHeader } from "@/components/settings/primitives";
import { TenantDirectory } from "@/components/ops/TenantDirectory";
import { loadOpsTenants } from "@/lib/api/admin-ops";

export const metadata: Metadata = { title: "Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* Tenant directory (plan 3.13 step 3): every workspace with its plan, member count and status,
   from control-plane tables only (no tenant content). Suspend and reinstate emit `admin-events`
   and the status flip goes through identity-tenant-service. The staff gate is in the layout. */
export default async function OpsTenantsPage() {
  const res = await loadOpsTenants();
  const tenants = res.kind === "live" ? res.data.tenants : [];
  const suspended = tenants.filter((t) => t.status === "suspended").length;

  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader title="Tenants" description="Every workspace on the platform. Opening this list is recorded in the ops audit log." />
      {res.kind === "live" ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Tenants" value={res.data.truncated ? `${tenants.length}+` : tenants.length} />
            <StatCard label="Suspended" value={suspended} />
            <StatCard label="Members" value={tenants.reduce((s, t) => s + (Number(t.member_count) || 0), 0)} />
          </div>
          {res.data.truncated ? (
            <Note tone="warning">Showing the newest {tenants.length} tenants. Older tenants are not listed here.</Note>
          ) : null}
          <TenantDirectory tenants={tenants} />
        </>
      ) : res.kind === "forbidden" ? (
        <Note tone="error">This account is not on the Mytheus staff list.</Note>
      ) : (
        <Note tone="warning">The tenant directory could not be loaded just now. Try again in a moment.</Note>
      )}
    </div>
  );
}
