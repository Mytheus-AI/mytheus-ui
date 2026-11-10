import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, DownloadSimple, PlugsConnected, CreditCard, Trash } from "@phosphor-icons/react/dist/ssr";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineRow, Note, PageHeader, SectionCard } from "@/components/settings/primitives";
import { StatCard, thClass } from "@/components/admin/StatCard";
import { resolveOrgContext } from "@/lib/api/org-context";
import { listMembers, type MemberTier } from "@/lib/api/members";
import { WorkspaceInvite } from "@/components/admin/WorkspaceInvite";
import { fetchUsage } from "@/lib/api/usage";

export const metadata: Metadata = { title: "Workspace admin | Mytheus" };

/* Tenant admin console, overview: members (`GET /users` plus pending Clerk invitations), the
   plan (`GET /usage` on `billing-metering-service`), integrations, and the data-rights requests
   (export, erasure). Integrations and the data requests have no service behind them yet
   (`integration-service` and `admin-ops-service` serve no routes), so they say "not
   available yet" and their buttons stay off rather than pretend to work. */

const tierTone: Record<MemberTier, "default" | "medium" | "low"> = {
  owner: "medium",
  admin: "low",
  member: "default",
};
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type Row = {
  key: string;
  name: string;
  email: string;
  imageUrl: string | null;
  tier: MemberTier;
  status: "active" | "invited";
  isYou: boolean;
};

/** Pending Clerk invitations for the active workspace, shown as "Invited" rows. */
async function pendingInvites(): Promise<Row[]> {
  const { orgId } = await auth();
  if (!orgId) return [];
  try {
    const { data } = await (await clerkClient()).organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
      limit: 100,
    });
    return data.map((inv) => ({
      key: inv.id,
      name: inv.emailAddress.split("@")[0],
      email: inv.emailAddress,
      imageUrl: null,
      tier: inv.role === "org:admin" ? "admin" : "member",
      status: "invited",
      isYou: false,
    }));
  } catch {
    return [];
  }
}

export default async function TenantAdminPage() {
  const [ctx, real, invited, usage] = await Promise.all([
    resolveOrgContext(),
    listMembers(),
    pendingInvites(),
    fetchUsage(),
  ]);
  const plan = usage.kind === "live" ? usage.usage.plan : null;
  const active: Row[] = (real ?? []).map((m) => ({
    key: m.id,
    name: m.name,
    email: m.email,
    imageUrl: m.imageUrl,
    tier: m.tier ?? "member",
    status: "active",
    isYou: m.isYou,
  }));
  const members = [...active, ...invited];

  return (
    <div className="flex flex-col gap-8 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Workspace admin"
        description={`Who is in ${ctx?.org.name ?? "this workspace"}, what it runs on, and the requests only an admin can make.`}
        actions={<WorkspaceInvite />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active members" value={real ? active.length : "-"} />
        <StatCard label="Pending invites" value={invited.length} />
        <StatCard label="Plan" value={plan?.name ?? "-"} />
        <StatCard label="Integrations" value="None yet" />
      </div>

      <section aria-labelledby="members-heading" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-[22px] sm:pt-[18px]">
          <div>
            <h2 id="members-heading" className="text-[16px] font-semibold text-ink">
              Members
            </h2>
            <p className="mt-0.5 text-[13.5px] text-ink-3">Owners and admins can manage the workspace. Members use it.</p>
          </div>
        </div>

        <table className="hidden w-full border-collapse border-t border-line text-left text-[14px] md:table">
          <thead>
            <tr className="bg-bg">
              <th scope="col" className={thClass}>Person</th>
              <th scope="col" className={thClass}>Access</th>
              <th scope="col" className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.key} className="transition-colors hover:bg-bg">
                <td className="max-w-[360px] px-5 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={m.name} id={m.email} src={m.imageUrl ?? undefined} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">
                        {m.name}
                        {m.isYou && <span className="ml-1.5 font-normal text-ink-3">(you)</span>}
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-3">{m.email}</span>
                    </span>
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={tierTone[m.tier]} className="capitalize">
                    {m.tier}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={m.status === "active" ? "success" : "default"} className="capitalize">
                    {m.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="divide-y divide-line border-t border-line md:hidden">
          {members.map((m) => (
            <li key={m.key} className="flex items-center gap-3 px-4 py-3.5">
              <Avatar name={m.name} id={m.email} src={m.imageUrl ?? undefined} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">
                  {m.name}
                  {m.isYou && <span className="ml-1.5 font-normal text-ink-3">(you)</span>}
                </span>
                <span className="block truncate text-[12.5px] text-ink-3">
                  {m.status === "invited" ? `Invited · ${m.email}` : m.email}
                </span>
              </span>
              <Badge tone={tierTone[m.tier]} className="shrink-0 capitalize">
                {m.tier}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/billing"
          className="group flex items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-sm transition-colors hover:border-line-2"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg-2 text-ink-2">
            <CreditCard size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">{plan ? `${plan.name} plan` : "Plan and billing"}</span>
            <span className="mt-0.5 block text-[13.5px] text-ink-3">
              {plan
                ? `${plan.seat_price_cents > 0 ? `${currency.format(plan.seat_price_cents / 100)} per seat on the price list` : "No charge on this plan"} · payments not connected yet`
                : "The plan could not be loaded just now"}
            </span>
          </span>
          <ArrowRight size={16} className="mt-1 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <Link
          href="/settings/integrations"
          className="group flex items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-sm transition-colors hover:border-line-2"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg-2 text-ink-2">
            <PlugsConnected size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Integrations</span>
            <span className="mt-0.5 block text-[13.5px] text-ink-3">
              Calendar, Slack and project tracker connections are not available yet
            </span>
          </span>
          <ArrowRight size={16} className="mt-1 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>

      <SectionCard title="Data and privacy" description="Requests that act on everything the workspace holds. Each one is logged to the audit trail.">
        <InlineRow
          label="Export workspace data"
          help="Meetings, transcripts, confirmed decisions and action items, as a downloadable archive."
        >
          <Button variant="outline" size="sm" disabled>
            <DownloadSimple size={16} aria-hidden />
            Request export
          </Button>
        </InlineRow>
        <InlineRow
          label="Erase a person's data"
          help="Removes one person's transcripts, notes and agent memory from every store, then confirms when it is done."
        >
          <Button variant="outline" size="sm" disabled>
            <Trash size={16} aria-hidden />
            Start erasure
          </Button>
        </InlineRow>
      </SectionCard>

      <Note>Export and erasure requests are not available yet. The admin service that runs and audits them is still being built, so these buttons stay off rather than pretend to work.</Note>
    </div>
  );
}
