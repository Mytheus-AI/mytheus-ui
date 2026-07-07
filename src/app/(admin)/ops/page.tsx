import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockTenantOps } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Ops console — Mytheus" };

/* Internal ops console: cross-tenant support / flags / cost, mock-only and
   feature-flagged behind a simple constant until the real internal tooling
   (and its RBAC) exists. Flip to false to hide the whole screen. */
const OPS_CONSOLE_ENABLED = true;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-signal">Internal ops</p>
          <h1 className="display mt-2 text-[clamp(1.6rem,3.5vw,2.2rem)]">
            Cross-tenant console
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-3">
            Support, flags, and cost across every tenant. Internal-only; mock
            data until the ops plane exists.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Card className="px-5 py-3.5">
            <p className="kicker text-[9px]">Variable cost / mo</p>
            <p className="mt-1 font-mono text-[20px] tabular-nums text-ink-display">
              {usd.format(totalCost)}
            </p>
          </Card>
          <Card className="px-5 py-3.5">
            <p className="kicker text-[9px]">Open tickets</p>
            <p className="mt-1 font-mono text-[20px] tabular-nums text-ink-display">
              {totalTickets}
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-bg-2/60">
              <th className="px-5 py-3.5 text-[12.5px] font-medium text-ink-3">Tenant</th>
              <th className="px-5 py-3.5 text-[12.5px] font-medium text-ink-3">Plan</th>
              <th className="px-5 py-3.5 text-right text-[12.5px] font-medium text-ink-3">
                Cost / mo
              </th>
              <th className="px-5 py-3.5 text-right text-[12.5px] font-medium text-ink-3">
                Agent tokens (M)
              </th>
              <th className="px-5 py-3.5 text-[12.5px] font-medium text-ink-3">Flags</th>
              <th className="px-5 py-3.5 text-right text-[12.5px] font-medium text-ink-3">
                Tickets
              </th>
            </tr>
          </thead>
          <tbody>
            {mockTenantOps.map((t, i) => (
              <tr
                key={t.orgId}
                className={i < mockTenantOps.length - 1 ? "border-b border-line" : ""}
              >
                <td className="max-w-[240px] px-5 py-3.5">
                  <p className="truncate text-[13.5px] font-medium text-ink">{t.name}</p>
                  <p className="truncate font-mono text-[10.5px] text-ink-3">{t.orgId}</p>
                </td>
                <td className="px-5 py-3.5">
                  <Badge
                    tone={t.plan === "enterprise" ? "success" : "default"}
                    className="capitalize"
                  >
                    {t.plan}
                  </Badge>
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-[13px] tabular-nums text-ink-2">
                  {usd.format(t.monthlyCostUsd)}
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-[13px] tabular-nums text-ink-2">
                  {t.agentTokensM.toFixed(1)}
                </td>
                <td className="px-5 py-3.5">
                  {t.flags.length === 0 ? (
                    <span className="text-[12px] text-ink-3">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1.5">
                      {t.flags.map((f) => (
                        <span
                          key={f}
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
                            f === "suspended"
                              ? "border-priority-high/30 bg-priority-high-soft text-priority-high"
                              : "border-line bg-bg-2 text-ink-2"
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-[13px] tabular-nums text-ink-2">
                  {t.openTickets}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] text-ink-3">
        LLM inference dominates variable cost — token spend is the number to
        watch, not seats.
      </p>
    </div>
  );
}
