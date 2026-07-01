import type { Metadata } from "next";
import { mockTenants, type Tenant } from "@/lib/mock/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Mytheus — Tenant ops",
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
});

export default function AdminOverviewPage() {
  const totalTenants = mockTenants.length;
  const activeTenants = mockTenants.filter((tenant) => tenant.status === "active").length;
  const totalSeats = mockTenants.reduce((sum, tenant) => sum + tenant.seats, 0);

  const tenantsByCreatedDesc = [...mockTenants].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="kicker">Tenant ops</p>
        <h1 className="mt-2 text-[26px] font-medium tracking-[-0.03em] text-ink-display">
          All organizations on Mytheus
        </h1>
        <p className="mt-1 text-[14px] text-ink-3">
          A read-only overview of every tenant currently provisioned on the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-[13px] text-ink-3">Total tenants</p>
          <p className="mt-2 text-[28px] font-medium tracking-[-0.03em] text-ink-display">
            {totalTenants}
          </p>
        </Card>
        <Card>
          <p className="text-[13px] text-ink-3">Active tenants</p>
          <p className="mt-2 text-[28px] font-medium tracking-[-0.03em] text-ink-display">
            {activeTenants}
          </p>
        </Card>
        <Card>
          <p className="text-[13px] text-ink-3">Total seats</p>
          <p className="mt-2 text-[28px] font-medium tracking-[-0.03em] text-ink-display">
            {totalSeats}
          </p>
        </Card>
      </div>

      <Card className="p-0">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-ink-3">
                Name
              </th>
              <th scope="col" className="px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-ink-3">
                Plan
              </th>
              <th scope="col" className="px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-ink-3">
                Seats
              </th>
              <th scope="col" className="px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-ink-3">
                Status
              </th>
              <th scope="col" className="px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-ink-3">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {tenantsByCreatedDesc.map((tenant) => (
              <tr key={tenant.id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3 text-ink">{tenant.name}</td>
                <td className="px-5 py-3">
                  <Badge>{planLabel[tenant.plan]}</Badge>
                </td>
                <td className="px-5 py-3 text-ink-2">{tenant.seats}</td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone[tenant.status]}>{statusLabel[tenant.status]}</Badge>
                </td>
                <td className="px-5 py-3 text-ink-2">
                  {dateFormatter.format(new Date(tenant.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
