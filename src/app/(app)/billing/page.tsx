import type { Metadata } from "next";
import { CreditCard, Receipt, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { Note, SectionCard } from "@/components/settings/primitives";
import { listMembers } from "@/lib/api/members";
import { fetchUsage } from "@/lib/api/usage";

export const metadata: Metadata = {
  title: "Billing | Mytheus",
};

/* Billing: the workspace's plan as `billing-metering-service` records it (`GET /usage`, RBAC
   admin: the `subscriptions` row joined to `plans`) and who is in the workspace (`GET /users`).
   Payments are not connected: the Stripe band (checkout, invoices, dunning) is not built, so
   this page says so plainly instead of showing an invoice history or a next charge. */

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US");

export default async function BillingPage() {
  const [usage, members] = await Promise.all([fetchUsage(), listMembers()]);

  return (
    <SettingsShell title="Billing" description="Your plan and who it covers. Payments are not connected yet.">
      {usage.kind === "live" ? (
        <section
          aria-label="Current plan"
          className="rounded-[28px] border border-line bg-surface p-5 shadow-sm [background-image:var(--wash)] sm:p-6"
        >
          <span className="inline-flex items-center rounded-full bg-pill px-3 py-1 text-[12px] font-semibold text-white">
            Current plan
          </span>
          <h3 className="display mt-3 text-[30px] text-ink-display">{usage.usage.plan.name}</h3>
          <p className="mt-1 text-[15px] text-ink-2">
            {usage.usage.plan.seat_price_cents > 0 ? (
              <>
                <b className="text-[22px] font-semibold text-ink">
                  {currency.format(usage.usage.plan.seat_price_cents / 100)}
                </b>{" "}
                per seat per month on the price list
              </>
            ) : (
              "No charge on this plan"
            )}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-ink-2">
            {members ? (
              <li className="inline-flex items-center gap-1.5">
                <UsersThree size={16} className="text-ink-3" aria-hidden="true" />
                {members.length} {members.length === 1 ? "member" : "members"} in this workspace
              </li>
            ) : null}
            <li>
              {usage.usage.plan.included_meeting_minutes > 0
                ? `${number.format(usage.usage.plan.included_meeting_minutes)} meeting minutes included`
                : "No meeting minute allowance"}
            </li>
            <li>{number.format(usage.usage.plan.included_agent_tokens)} agent tokens included per month</li>
          </ul>
          <div className="mt-5">
            <LinkButton href="/tenant/usage" variant="outline" size="sm">
              See usage this period
            </LinkButton>
          </div>
        </section>
      ) : (
        <Note>
          {usage.kind === "forbidden"
            ? "Only workspace admins can see the plan and billing. Ask an admin for access."
            : "The plan is not available from the server right now. Try again later."}
        </Note>
      )}

      <SectionCard title="Payments" description="Invoices, payment methods and seat charges.">
        <div className="flex items-start gap-3.5 px-4 py-[18px] sm:px-[22px]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-bg-2 text-ink-2">
            <CreditCard size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">Payments are not connected yet</p>
            <p className="mt-0.5 max-w-[60ch] text-[13px] text-ink-3">
              This workspace has not been charged and has no invoices. Checkout, invoices and seat billing arrive with the
              payments release; until then nothing here bills you.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3.5 px-4 py-[18px] sm:px-[22px]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-bg-2 text-ink-2">
            <Receipt size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">No invoices</p>
            <p className="mt-0.5 max-w-[60ch] text-[13px] text-ink-3">Invoices will be listed here once payments are connected.</p>
          </div>
        </div>
      </SectionCard>
    </SettingsShell>
  );
}
