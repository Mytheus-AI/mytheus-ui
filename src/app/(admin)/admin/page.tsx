import type { Metadata } from "next";
import { mockTenants, type Tenant } from "@/lib/mock/data";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/settings/primitives";
import { StatCard, thClass } from "@/components/admin/StatCard";

export const metadata: Metadata = {
  title: "Mytheus | Tenant ops",
};

const planLabel: Record<Tenant["plan"], string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const statusTone: Record<Tenant["status"], "success" | "default" | "danger"> = {
  active: "success",
  trial: "default",
  suspended: "danger",
};

const statusLabel: Record<Tenant["status"], string> = {
  active: "Active",
  trial: "Trial",
  suspended: "Suspended",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export default function AdminOverviewPage() {
  const totalTenants = mockTenants.length;
  const activeTenants = mockTenants.filter((tenant) => tenant.status === "active").length;
  const totalSeats = mockTenants.reduce((sum, tenant) => sum + tenant.seats, 0);

  const tenantsByCreatedDesc = [...mockTenants].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="All organizations on Mytheus"
        description="A read-only overview of every tenant currently provisioned on the platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total tenants" value={totalTenants} />
        <StatCard label="Active tenants" value={activeTenants} />
        <StatCard label="Total seats" value={totalSeats} />
      </div>

      {tenantsByCreatedDesc.length === 0 ? (
        <EmptyState title="No tenants yet" description="Organizations appear here once they are provisioned." />
      ) : (
        <section aria-label="Tenants" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
          {/* md and up: a table */}
          <table className="hidden w-full border-collapse text-left text-[14px] md:table">
            <thead>
              <tr className="bg-bg">
                <th scope="col" className={thClass}>Name</th>
                <th scope="col" className={thClass}>Plan</th>
                <th scope="col" className={thClass}>Seats</th>
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={thClass}>Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tenantsByCreatedDesc.map((tenant) => (
                <tr key={tenant.id} className="transition-colors hover:bg-bg">
                  <td className="max-w-[260px] truncate px-5 py-3.5 font-semibold text-ink">{tenant.name}</td>
                  <td className="px-5 py-3.5">
                    <Badge>{planLabel[tenant.plan]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-ink-2">{tenant.seats}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={statusTone[tenant.status]}>{statusLabel[tenant.status]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-ink-2">{dateFormatter.format(new Date(tenant.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* below md: one block per tenant, so nothing scrolls sideways */}
          <ul className="divide-y divide-line md:hidden">
            {tenantsByCreatedDesc.map((tenant) => (
              <li key={tenant.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-[15px] font-semibold text-ink">{tenant.name}</p>
                  <Badge tone={statusTone[tenant.status]} className="shrink-0">
                    {statusLabel[tenant.status]}
                  </Badge>
                </div>
                <dl className="mt-2.5 grid grid-cols-3 gap-3 text-[13px]">
                  <div>
                    <dt className="text-ink-3">Plan</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{planLabel[tenant.plan]}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Seats</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-ink">{tenant.seats}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Created</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {dateFormatter.format(new Date(tenant.createdAt))}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
