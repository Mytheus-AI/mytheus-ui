import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, DownloadSimple, PlugsConnected, CreditCard, Trash } from "@phosphor-icons/react/ssr";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineRow, Note, PageHeader, SectionCard, dangerGhost } from "@/components/settings/primitives";
import { StatCard, theadRowClass, thClass } from "@/components/admin/StatCard";
import { resolveOrgContext } from "@/lib/api/org-context";
import { listMembers, type MemberTier } from "@/lib/api/members";
import { WorkspaceInvite } from "@/components/admin/WorkspaceInvite";
import { fetchUsage } from "@/lib/api/usage";
import { loadIntegrations } from "@/lib/api/integrations";

export const metadata: Metadata = { title: "Workspace admin | Mytheus" };

/* Tenant admin console, overview: members (`GET /users` plus pending Clerk invitations), the
   plan (`GET /usage` on `billing-metering-service`), integrations (`GET /integrations` on
   `integration-service`), and the data-rights requests. Export lives on its own tab over
   `/admin/tenant/data-export`; erasure has no console route yet, so its button stays off. */

const TIER_LABEL: Record<MemberTier, string> = { owner: "Owner", admin: "Admin", member: "Member" };

function TierChip({ tier }: { tier: MemberTier }) {
  return (
    <Badge
      className={
        tier === "owner"
          ? "!bg-signal-soft !text-signal-ink"
          : tier === "member"
            ? "!bg-transparent !text-ink-3 ring-1 ring-inset ring-line-2"
            : "!text-ink"
      }
    >
      {TIER_LABEL[tier]}
    </Badge>
  );
}

function StatusChip({ status }: { status: Row["status"] }) {
  return status === "active" ? <Badge tone="success">Active</Badge> : <Badge tone="medium">Invited</Badge>;
}

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
  const [ctx, real, invited, usage, integrations] = await Promise.all([
    resolveOrgContext(),
    listMembers(),
    pendingInvites(),
    fetchUsage(),
    loadIntegrations(),
  ]);
  const connected =
    integrations.kind === "live"
      ? Array.from(integrations.items.values()).filter((i) => i.status === "active" || i.status === "degraded").length
      : null;
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workspace admin"
        description={`Who is in ${ctx?.org.name || "this workspace"}, what it runs on, and the requests only an admin can make.`}
        actions={<WorkspaceInvite />}
      />

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active members" value={real ? active.length : "Not loaded"} hint="Signed in at least once" />
        <StatCard label="Pending invites" value={invited.length} hint={invited.length ? "Waiting to accept" : "None waiting"} />
        <StatCard label="Plan" value={plan?.name ?? "Not loaded"} hint={plan ? "From billing" : "Billing did not answer"} />
        <StatCard
          label="Integrations"
          value={connected ?? "Not loaded"}
          hint={connected === null ? "Did not answer" : connected === 0 ? "Nothing connected" : "Connected"}
        />
      </div>

      <SectionCard
        title="Members"
        headingLevel={2}
        headingId="members-heading"
        description="Owners and admins manage the workspace. Members use it."
        aside={members.length > 0 ? <span className="text-[14px] font-medium text-ink-3">{members.length} in total</span> : undefined}
      >
        {real === null ? (
          <div className="px-4 py-4 sm:px-[22px]">
            <Note tone="warning">The member list could not be loaded just now. Reload the page to try again.</Note>
          </div>
        ) : null}

        {members.length === 0 ? (
          real === null ? null : (
            <EmptyState
              className="!rounded-none !border-0 !bg-transparent"
              title="No one here yet"
              description="Invite people by email. They appear here as soon as the invitation is sent."
            />
          )
        ) : (
          <div>
            <table className="hidden w-full border-collapse text-left text-[14.5px] md:table">
              <caption className="sr-only">Workspace members, their access and status</caption>
              <thead>
                <tr className={theadRowClass}>
                  <th scope="col" className={`${thClass} !pl-[22px]`}>Person</th>
                  <th scope="col" className={thClass}>Access</th>
                  <th scope="col" className={`${thClass} !pr-[22px]`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {members.map((m) => (
                  <tr key={m.key} className="transition-colors duration-150 hover:bg-surface-2">
                    <td className="max-w-[420px] py-3 pl-[22px] pr-5">
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar name={m.name} id={m.email} src={m.imageUrl ?? undefined} size="md" />
                        <span className="min-w-0">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-semibold text-ink">{m.name}</span>
                            {m.isYou ? <Badge className="shrink-0">You</Badge> : null}
                          </span>
                          <span className="block truncate text-[13.5px] text-ink-3">{m.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <TierChip tier={m.tier} />
                    </td>
                    <td className="py-3 pl-5 pr-[22px]">
                      <StatusChip status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {members.map((m) => (
                <li key={m.key} className="flex items-center gap-3 px-4 py-3.5">
                  <Avatar name={m.name} id={m.email} src={m.imageUrl ?? undefined} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-ink">{m.name}</span>
                      {m.isYou ? <Badge className="shrink-0">You</Badge> : null}
                    </span>
                    <span className="block truncate text-[13.5px] text-ink-3">{m.email}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <TierChip tier={m.tier} />
                      <StatusChip status={m.status} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-5 md:grid-cols-2">
        <Link
          href="/billing"
          className="group flex items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-warm-1 transition-colors duration-150 hover:border-line-2 hover:bg-surface-2 focus-visible:!rounded-card"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2" aria-hidden="true">
            <CreditCard size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-ink">{plan ? `${plan.name} plan` : "Plan and billing"}</span>
            <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-3">
              {plan
                ? `${plan.seat_price_cents > 0 ? `${currency.format(plan.seat_price_cents / 100)} per seat on the price list.` : "No charge on this plan."} Payments are not connected yet.`
                : "The plan could not be loaded just now."}
            </span>
          </span>
          <ArrowRight
            size={16}
            className="mt-1 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </Link>
        <Link
          href="/settings/integrations"
          className="group flex items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-warm-1 transition-colors duration-150 hover:border-line-2 hover:bg-surface-2 focus-visible:!rounded-card"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2" aria-hidden="true">
            <PlugsConnected size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-ink">Integrations</span>
            <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-3">
              {connected === null
                ? "Calendar, Slack and Jira connections could not be loaded just now."
                : connected === 0
                  ? "Nothing connected yet. Connect Calendar, Slack and Jira."
                  : `${connected} connected. Manage Calendar, Slack and Jira.`}
            </span>
          </span>
          <ArrowRight
            size={16}
            className="mt-1 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </Link>
      </div>

      <SectionCard
        tone="danger"
        headingLevel={2}
        headingId="data-requests-heading"
        title="Data requests"
        description="Requests that act on everything the workspace holds. Each one is logged to the audit trail."
      >
        <InlineRow
          label="Export workspace data"
          help="Meetings, transcripts, confirmed decisions and action items, as a downloadable archive."
        >
          <LinkButton href="/tenant/data" variant="outline" size="sm" className="focus-visible:!rounded-ctl">
            <DownloadSimple size={16} aria-hidden />
            Export data
          </LinkButton>
        </InlineRow>
        <InlineRow
          label="Erase a person's data"
          help="Removes one person's transcripts, notes and agent memory from every store, then confirms when it is done. This cannot be undone."
        >
          <Button variant="outline" size="sm" disabled className={dangerGhost}>
            <Trash size={16} aria-hidden />
            Start erasure
          </Button>
        </InlineRow>
        <div className="px-4 py-4 sm:px-[22px]">
          <Note>
            Erasing one person&apos;s data is not available from this console yet, so that button stays off rather than
            pretend to work.
          </Note>
        </div>
      </SectionCard>
    </div>
  );
}
