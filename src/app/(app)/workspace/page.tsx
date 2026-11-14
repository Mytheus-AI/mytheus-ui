import type { Metadata } from "next";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRight, ChartBar, PlugsConnected, Sparkle, UsersThree } from "@phosphor-icons/react/ssr";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Card, CardHead, cardClass } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionBar } from "@/components/ui/Page";
import { TextLink } from "@/components/ui/TextLink";
import { LinkButton } from "@/components/ui/Button";
import { isNoCap, planLabel, tokensShort } from "@/lib/plans";
import { StatCard } from "@/components/admin/StatCard";
import { WorkspaceInvite } from "@/components/admin/WorkspaceInvite";
import { ReadinessStrip } from "@/components/org-brain/ReadinessMeter";
import { OrgNameCard } from "@/components/tenant/OrgNameCard";
import { OrgLogoCard } from "@/components/tenant/OrgLogoCard";
import { listMembers } from "@/lib/api/members";
import { fetchUsage, type UsageOut } from "@/lib/api/usage";
import { LevelLabel, MeterBar, formatNumber, formatPercent, levelOf } from "@/components/tenant/UsageMeter";
import { loadIntegrations } from "@/lib/api/integrations";
import { fetchReadiness } from "@/lib/api/org-brain";

export const metadata: Metadata = { title: "Workspace | Mytheus" };

/* The Workspace console's Overview: the headline counts (members from `GET /users`, pending Clerk
   invitations, the plan from `GET /usage`, integrations from `GET /integrations`), how ready the
   company brain is, the workspace's name and logo, and the way into each tab. The member list itself is on
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

/** The first day of the month after `period` ("2026-11" -> Dec 1), when the allowance resets. */
function resetLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return "next month";
  return new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/* This month's AI allowance at a glance: the live budget the agent tier is gated on. Stretches to
   the bottom of the column so the two sides of the overview end level. */
function TokenAllowance({ usage }: { usage: UsageOut | null }) {
  const b = usage?.budget;
  const ratio = b && b.token_quota > 0 ? b.tokens_consumed / b.token_quota : 0;
  return (
    <section aria-labelledby="ai-month-heading" className={cardClass({ className: "flex flex-1 flex-col gap-4" })}>
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2" aria-hidden="true">
          <Sparkle size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="ai-month-heading" className="text-[17px] font-semibold text-ink">
            AI this month
          </h2>
          <p className="mt-0.5 text-[14px] leading-relaxed text-ink-3">
            {usage ? `Tokens every Myte has used. The allowance resets on ${resetLabel(usage.period)}.` : "The allowance could not be loaded just now."}
          </p>
        </div>
      </div>
      {b && b.token_quota > 0 && !isNoCap(b.token_quota) ? (
        <div className="mt-auto">
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="display text-[34px] leading-none tabular-nums text-ink-display">{formatNumber(b.tokens_consumed)}</span>
            <span className="text-[14px] text-ink-2">
              of {formatNumber(b.token_quota)}, <span className="font-semibold text-ink">{formatPercent(ratio)}</span>
            </span>
          </p>
          <div className="mt-3">
            <MeterBar label="AI tokens this month" used={b.tokens_consumed} included={b.token_quota} />
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <LevelLabel level={levelOf(ratio)} okText={`${formatNumber(Math.max(b.token_quota - b.tokens_consumed, 0))} left`} />
            <TextLink href="/workspace/billing">See usage</TextLink>
          </div>
        </div>
      ) : b ? (
        <p className="mt-auto text-[14px] text-ink-2">
          <span className="display text-[34px] leading-none tabular-nums text-ink-display">{formatNumber(b.tokens_consumed)}</span> tokens, no
          cap on this plan.
          {usage?.payg ? ` ${currency.format(usage.payg.cost_cents / 100)} of the ${currency.format(usage.payg.deposit_cents / 100)} deposit used so far.` : ""}
        </p>
      ) : null}
    </section>
  );
}

/* The plan, with the way up beside it: Upgrade opens the Plans page (the four plans as cards,
   paid through Razorpay). A top plan or a staff-set one has nothing to upgrade to. */
function PlanCard({ usage }: { usage: UsageOut | null }) {
  const plan = usage?.plan ?? null;
  const top = plan ? ["payg", "unlimited", "enterprise"].includes(plan.code) : false;
  const until = usage?.paid_until ? new Date(usage.paid_until).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  const line = !plan
    ? "The plan could not be loaded just now."
    : plan.code === "payg"
      ? `A ${currency.format(plan.seat_price_cents / 100)} deposit, settled on what you use${until ? ` on ${until}` : ""}.`
      : plan.code === "unlimited"
        ? "Set by Mytheus staff. No cap and nothing to pay."
        : plan.seat_price_cents > 0
          ? `${currency.format(plan.seat_price_cents / 100)} a month${until ? `, paid until ${until}` : ""}.`
          : `${tokensShort(plan.included_agent_tokens)} AI tokens a month, no charge.`;
  return (
    <div className={cardClass({ className: "flex items-start gap-4" })}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2" aria-hidden="true">
        <ChartBar size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <Link href="/workspace/billing" className="block text-[17px] font-semibold text-ink hover:underline">
          {plan ? `${planLabel(plan.code)} plan` : "Usage and billing"}
        </Link>
        <p className="mt-0.5 text-[14px] leading-relaxed text-ink-3">{line}</p>
      </div>
      {plan && !top ? (
        <LinkButton href="/workspace/billing/plans" size="sm" className="shrink-0">
          <Sparkle size={15} weight="fill" aria-hidden />
          Upgrade
        </LinkButton>
      ) : (
        <LinkButton href="/workspace/billing/plans" size="sm" variant="outline" className="shrink-0">
          Plans
        </LinkButton>
      )}
    </div>
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
        <StatCard label="Plan" value={plan ? planLabel(plan.code) : "Not loaded"} hint={plan ? "From billing" : "Billing did not answer"} />
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
          description="What every Myte knows about the company: what it does, its words, who owns what, its goals and what is off limits."
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <OrgNameCard />
          <OrgLogoCard />
        </div>
        <div className="flex flex-col gap-4">
          <QuickLink href="/workspace/members" icon={UsersThree} title="Members">
            {members ? `${members.length} ${members.length === 1 ? "person" : "people"}. Change access or remove it.` : "The member list could not be loaded just now."}
          </QuickLink>
          <PlanCard usage={usage.kind === "live" ? usage.usage : null} />
          <QuickLink href="/settings/integrations" icon={PlugsConnected} title="Integrations">
            {connected === null
              ? "Calendar, Slack and Jira connections could not be loaded just now."
              : connected === 0
                ? "Nothing connected yet. Connect Calendar, Slack and Jira."
                : `${connected} connected. Manage Calendar, Slack and Jira.`}
          </QuickLink>
          <TokenAllowance usage={usage.kind === "live" ? usage.usage : null} />
        </div>
      </div>
    </div>
  );
}
