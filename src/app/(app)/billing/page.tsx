import type { Metadata } from "next";
import { CalendarBlank, Coins, Timer, UsersThree } from "@phosphor-icons/react/ssr";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { Note, SectionCard, focusPill } from "@/components/settings/primitives";
import { UsageMeter, periodLabel } from "@/components/tenant/UsageMeter";
import { listMembers } from "@/lib/api/members";
import { fetchUsage } from "@/lib/api/usage";

export const metadata: Metadata = {
  title: "Billing | Mytheus",
};

/* Billing: the workspace's plan as `billing-metering-service` records it (`GET /usage`, RBAC
   admin: the `subscriptions` row joined to `plans`, plus this period's budget and aggregates) and
   who is in the workspace (`GET /users`). Payments are not connected: the Stripe band (checkout,
   invoices, dunning) is not built, so the invoices card says so plainly instead of listing
   invoices or a next charge. */

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US");

export default async function BillingPage() {
  const [usage, members] = await Promise.all([fetchUsage(), listMembers()]);

  return (
    <SettingsShell title="Billing" description="Your plan, what the workspace has used this period, and invoices.">
      {usage.kind === "live" ? (
        <>
          <section
            aria-labelledby="plan-heading"
            className="grid gap-6 rounded-hero border border-[color:color-mix(in_srgb,var(--signal)_22%,var(--line))] bg-wash p-5 shadow-warm-2 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
          >
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-pill px-3 py-1 text-[12.5px] font-semibold text-pill-on">
                Current plan
              </span>
              <h3 id="plan-heading" className="display mt-3 text-[32px] text-ink-display sm:text-[36px]">
                {usage.usage.plan.name}
              </h3>
              <p className="mt-1 text-[15px] text-ink-2">
                {usage.usage.plan.seat_price_cents > 0 ? (
                  <>
                    <span className="display text-[24px] text-ink">
                      {currency.format(usage.usage.plan.seat_price_cents / 100)}
                    </span>{" "}
                    per seat per month on the price list
                  </>
                ) : (
                  "No charge on this plan"
                )}
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2">
                {members ? (
                  <li className="inline-flex items-center gap-1.5">
                    <UsersThree size={17} className="text-ink-3" aria-hidden="true" />
                    {members.length} {members.length === 1 ? "member" : "members"} in this workspace
                  </li>
                ) : null}
                <li className="inline-flex items-center gap-1.5">
                  <Timer size={17} className="text-ink-3" aria-hidden="true" />
                  {usage.usage.plan.included_meeting_minutes > 0
                    ? `${number.format(usage.usage.plan.included_meeting_minutes)} meeting minutes included`
                    : "No meeting minute allowance"}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Coins size={17} className="text-ink-3" aria-hidden="true" />
                  {number.format(usage.usage.plan.included_agent_tokens)} agent tokens included per month
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/tenant/usage" variant="outline" className={focusPill}>
                See usage in detail
              </LinkButton>
            </div>
          </section>

          <SectionCard
            title="Usage this period"
            description={`${periodLabel(usage.usage.period)}. Live captions and transcription keep running even if the agent budget runs out.`}
          >
            <UsageMeter
              label="Agent tokens"
              unit="tokens"
              used={usage.usage.budget.tokens_consumed}
              included={usage.usage.budget.token_quota || null}
            />
            <UsageMeter
              label="Meeting minutes"
              unit="minutes"
              used={usage.usage.dimensions.find((d) => d.dimension === "meeting_minute")?.quantity ?? 0}
              included={usage.usage.plan.included_meeting_minutes || null}
            />
          </SectionCard>
        </>
      ) : (
        <Note tone={usage.kind === "forbidden" ? "info" : "warning"}>
          {usage.kind === "forbidden"
            ? "Only workspace admins can see the plan and billing. Ask an admin for access."
            : "The plan is not available from the server right now. Try again in a few minutes."}
        </Note>
      )}

      <SectionCard
        title="Invoices"
        description="Payments are not connected yet. This workspace has not been charged, and nothing here bills you."
      >
        <EmptyState
          className="!rounded-none !border-0 !bg-transparent !py-10"
          title="No invoices yet"
          description="Checkout, invoices and seat billing arrive with the payments release. Each invoice will be listed here with its date, status and amount."
        />
        <div className="flex items-center gap-2 px-4 py-3.5 text-[13.5px] text-ink-3 sm:px-[22px]">
          <CalendarBlank size={16} aria-hidden="true" />
          No next charge is scheduled.
        </div>
      </SectionCard>
    </SettingsShell>
  );
}
