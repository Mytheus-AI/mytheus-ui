import type { Metadata } from "next";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRight, ChartBar, PlugsConnected, UsersThree } from "@phosphor-icons/react/ssr";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Card, CardHead, cardClass } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionBar } from "@/components/ui/Page";
import { TextLink } from "@/components/ui/TextLink";
import { StatCard } from "@/components/admin/StatCard";
import { WorkspaceInvite } from "@/components/admin/WorkspaceInvite";
import { ReadinessStrip } from "@/components/org-brain/ReadinessMeter";
import { OrgNameCard } from "@/components/tenant/OrgNameCard";
import { listMembers } from "@/lib/api/members";
import { fetchUsage } from "@/lib/api/usage";
import { loadIntegrations } from "@/lib/api/integrations";
import { fetchReadiness } from "@/lib/api/org-brain";

export const metadata: Metadata = { title: "Workspace | Mytheus" };

/* The Workspace console's Overview: the headline counts (members from `GET /users`, pending Clerk
   invitations, the plan from `GET /usage`, integrations from `GET /integrations`), how ready the
   company brain is, the workspace's name, and the way into each tab. The member list itself is on
   Members; the data requests are on Data and privacy. Every read degrades its own card. */

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** How many Clerk invitations to this workspace are still pending. */
async function pendingInviteCount(): Promise<number | null> {
  const { orgId } = await auth();
  if (!orgId) return 0;
  try {
    const { totalCount } = await (await clerkClient()).organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
      limit: 1,
    });
    return totalCount;
  } catch {
    return null;
  }
}

function QuickLink({ href, icon: I, title, children }: { href: string; icon: Icon; title: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cardClass({ className: "group flex items-start gap-4 transition-colors duration-150 hover:border-line-2 hover:bg-surface-2" })}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2" aria-hidden="true">
        <I size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-3">{children}</span>
      </span>
      <ArrowRight size={16} className="mt-1 shrink-0 text-ink-3 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export default async function WorkspaceOverviewPage() {
  const [members, invited, usage, integrations, readiness] = await Promise.all([
    listMembers(),
    pendingInviteCount(),
    fetchUsage(),
    loadIntegrations(),
    fetchReadiness(),
  ]);
  const connected =
    integrations.kind === "live"
      ? Array.from(integrations.items.values()).filter((i) => i.status === "active" || i.status === "degraded").length
      : null;
  const plan = usage.kind === "live" ? usage.usage.plan : null;

  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Overview" context="The workspace at a glance, and where to change each part of it." action={<WorkspaceInvite />} />

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active members" value={members ? members.length : "Not loaded"} hint="Signed in at least once" />
        <StatCard
          label="Pending invites"
          value={invited ?? "Not loaded"}
          hint={invited === null ? "Clerk did not answer" : invited ? "Waiting to accept" : "None waiting"}
        />
        <StatCard label="Plan" value={plan?.name ?? "Not loaded"} hint={plan ? "From billing" : "Billing did not answer"} />
        <StatCard
          label="Integrations"
          value={connected ?? "Not loaded"}
          hint={connected === null ? "Did not answer" : connected === 0 ? "Nothing connected" : "Connected"}
        />
      </div>

      <Card as="section" flush aria-labelledby="brain-heading">
        <CardHead
          id="brain-heading"
          title="Company brain"
          description="What every agent knows about the company: what it does, its words, who owns what, its goals and what is off limits."
          right={<TextLink href="/workspace/brain">Open the company brain</TextLink>}
        />
        {readiness.ok ? (
          <div className="px-4 pb-[18px] sm:px-[22px]">
            <ReadinessStrip readiness={readiness.data} />
          </div>
        ) : (
          <ErrorState variant="inline" title="The readiness checks could not be loaded" text="The company brain still opens." />
        )}
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <OrgNameCard />
        <div className="grid gap-4">
          <QuickLink href="/workspace/members" icon={UsersThree} title="Members">
            {members ? `${members.length} ${members.length === 1 ? "person" : "people"}. Change access or remove it.` : "The member list could not be loaded just now."}
          </QuickLink>
          <QuickLink href="/workspace/billing" icon={ChartBar} title={plan ? `${plan.name} plan` : "Usage and billing"}>
            {plan
              ? `${plan.seat_price_cents > 0 ? `${currency.format(plan.seat_price_cents / 100)} per seat on the price list.` : "No charge on this plan."} Payments are not connected yet.`
              : "The plan could not be loaded just now."}
          </QuickLink>
          <QuickLink href="/settings/integrations" icon={PlugsConnected} title="Integrations">
            {connected === null
              ? "Calendar, Slack and Jira connections could not be loaded just now."
              : connected === 0
                ? "Nothing connected yet. Connect Calendar, Slack and Jira."
                : `${connected} connected. Manage Calendar, Slack and Jira.`}
          </QuickLink>
        </div>
      </div>
    </div>
  );
}
