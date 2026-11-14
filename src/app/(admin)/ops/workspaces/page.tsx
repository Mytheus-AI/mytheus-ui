import type { Metadata } from "next";
import { KpiStrip } from "@/components/ops/viz/Figures";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { PageHead } from "@/components/ui/Page";
import { TenantDirectory } from "@/components/ops/TenantDirectory";
import { loadOpsTenants } from "@/lib/api/admin-ops";

export const metadata: Metadata = { title: "Workspaces | Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* Tenant directory (plan 3.13 step 3): every workspace with its plan, member count and status,
   from control-plane tables only (no tenant content). Suspend and reinstate emit `admin-events`
   and the status flip goes through identity-tenant-service. The staff gate is in the layout. */
export default async function OpsWorkspacesPage() {
  const res = await loadOpsTenants();
  const tenants = res.kind === "live" ? res.data.tenants : [];
  const suspended = tenants.filter((t) => t.status === "suspended").length;

  return (
    <div className="flex flex-col gap-5 [&>header:first-child]:-mb-5">
      <PageHead title="Workspaces" context="Every workspace on the platform. Open one for its placement, usage, flags and support access. Opening this list is recorded in the ops audit log." />
      {res.kind === "live" ? (
        <>
          <KpiStrip
            label="Workspace figures"
            items={[
              { label: "Workspaces", value: res.data.truncated ? `${tenants.length}+` : tenants.length, hint: "Every workspace on the platform" },
              { label: "Suspended", value: suspended, hint: suspended ? "Members have no access" : "None suspended" },
              { label: "Members", value: tenants.reduce((s, t) => s + (Number(t.member_count) || 0), 0), hint: "Across every workspace" },
            ]}
          />
          {res.data.truncated ? (
            <Note tone="warning">Showing the newest {tenants.length} tenants. Older tenants are not listed here.</Note>
          ) : null}
          <TenantDirectory tenants={tenants} />
        </>
      ) : res.kind === "forbidden" ? (
        <Note tone="error">This account is not on the Mytheus staff list.</Note>
      ) : (
        <ErrorState title="The tenant directory could not be loaded" />
      )}
    </div>
  );
}
