import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/settings/primitives";
import { StatCard, thClass } from "@/components/admin/StatCard";
import { mockTenantOps } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Ops console | Mytheus" };

/* Internal ops console: cross-tenant support / flags / cost, mock-only and
   feature-flagged behind a simple constant until the real internal tooling
   (and its RBAC) exists. Flip to false to hide the whole screen. */
const OPS_CONSOLE_ENABLED = true;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function Flags({ flags }: { flags: string[] }) {
  if (flags.length === 0) return <span className="text-[13px] text-ink-3">None</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {flags.map((f) => (
        <Badge key={f} tone={f === "suspended" ? "danger" : "default"}>
          {f}
        </Badge>
      ))}
    </span>
  );
}

export default function OpsPage() {
  if (!OPS_CONSOLE_ENABLED) {
    return (
      <EmptyState
        title="Ops console is disabled"
        description="Flip OPS_CONSOLE_ENABLED once internal tooling access is sorted."
      />
    );
  }

  const totalCost = mockTenantOps.reduce((n, t) => n + t.monthlyCostUsd, 0);
  const totalTickets = mockTenantOps.reduce((n, t) => n + t.openTickets, 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Cross-tenant console"
        description="Support, flags, and cost across every tenant. Internal-only; mock data until the ops plane exists."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
        <StatCard label="Variable cost / mo" value={usd.format(totalCost)} />
        <StatCard label="Open tickets" value={totalTickets} />
      </div>

      {mockTenantOps.length === 0 ? (
        <EmptyState title="No tenants yet" description="Cost, flags and tickets appear here once tenants exist." />
      ) : (
        <section aria-label="Tenants" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
          <table className="hidden w-full border-collapse text-left md:table">
            <thead>
              <tr className="bg-bg">
                <th scope="col" className={thClass}>Tenant</th>
                <th scope="col" className={thClass}>Plan</th>
                <th scope="col" className={`${thClass} text-right`}>Cost / mo</th>
                <th scope="col" className={`${thClass} text-right`}>Agent tokens (M)</th>
                <th scope="col" className={thClass}>Flags</th>
                <th scope="col" className={`${thClass} text-right`}>Tickets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {mockTenantOps.map((t) => (
                <tr key={t.orgId} className="transition-colors hover:bg-bg">
                  <td className="max-w-[240px] px-5 py-3.5">
                    <p className="truncate text-[14px] font-semibold text-ink">{t.name}</p>
                    <p className="truncate text-[12px] text-ink-3">{t.orgId}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={t.plan === "enterprise" ? "success" : "default"} className="capitalize">
                      {t.plan}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right text-[14px] tabular-nums text-ink-2">
                    {usd.format(t.monthlyCostUsd)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[14px] tabular-nums text-ink-2">
                    {t.agentTokensM.toFixed(1)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Flags flags={t.flags} />
                  </td>
                  <td className="px-5 py-3.5 text-right text-[14px] tabular-nums text-ink-2">{t.openTickets}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-line md:hidden">
            {mockTenantOps.map((t) => (
              <li key={t.orgId} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">{t.name}</p>
                    <p className="truncate text-[12px] text-ink-3">{t.orgId}</p>
                  </div>
                  <Badge tone={t.plan === "enterprise" ? "success" : "default"} className="shrink-0 capitalize">
                    {t.plan}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
                  <div>
                    <dt className="text-ink-3">Cost / mo</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-ink">{usd.format(t.monthlyCostUsd)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Tokens (M)</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-ink">{t.agentTokensM.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Tickets</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-ink">{t.openTickets}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <p className="mb-1 text-[13px] text-ink-3">Flags</p>
                  <Flags flags={t.flags} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[12.5px] text-ink-3">
        LLM inference dominates variable cost. Token spend is the number to watch, not seats.
      </p>
    </div>
  );
}
