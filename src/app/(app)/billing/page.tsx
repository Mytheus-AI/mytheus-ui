import type { Metadata } from "next";
import { CalendarBlank, Receipt, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { mockBilling } from "@/lib/mock/data";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SectionCard } from "@/components/settings/primitives";
import { SeatMeter } from "@/components/billing/SeatMeter";

export const metadata: Metadata = {
  title: "Billing | Mytheus",
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BillingPage() {
  const { plan, seatsUsed, seatsTotal, pricePerSeat, billingCycle, nextInvoiceDate, nextInvoiceAmount, invoices } =
    mockBilling;

  const sortedInvoices = [...invoices].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <SettingsShell title="Billing" description="Your plan, what you have used this cycle, and past invoices.">
      {/* Current plan */}
      <section
        aria-label="Current plan"
        className="rounded-[28px] border border-line bg-surface p-5 shadow-sm [background-image:var(--wash)] sm:p-6"
      >
        <span className="inline-flex items-center rounded-full bg-pill px-3 py-1 text-[12px] font-semibold text-white">
          Current plan
        </span>
        <h3 className="display mt-3 text-[30px] text-ink-display">{capitalize(plan)}</h3>
        <p className="mt-1 text-[15px] text-ink-2">
          <b className="text-[22px] font-semibold text-ink">{currency.format(pricePerSeat)}</b> per seat
          per {billingCycle === "monthly" ? "month" : "year"}, billed {billingCycle}
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-ink-2">
          <li className="inline-flex items-center gap-1.5">
            <UsersThree size={16} className="text-ink-3" aria-hidden="true" />
            {seatsUsed} of {seatsTotal} seats used
          </li>
          <li className="inline-flex items-center gap-1.5">
            <CalendarBlank size={16} className="text-ink-3" aria-hidden="true" />
            Next invoice {formatDate(nextInvoiceDate)}
          </li>
        </ul>
      </section>

      <SectionCard title="Usage this cycle" description="Seats in use against the seats you pay for.">
        <SeatMeter used={seatsUsed} total={seatsTotal} />
      </SectionCard>

      <SectionCard title="Next invoice">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-[18px] sm:px-[22px]">
          <div className="inline-flex items-center gap-2.5">
            <Receipt size={20} className="text-ink-3" aria-hidden="true" />
            <p className="display text-[22px] text-ink-display">{formatDate(nextInvoiceDate)}</p>
          </div>
          <p className="display text-[22px] tabular-nums text-ink-display">
            {currency.format(nextInvoiceAmount)}
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Invoice history">
        {sortedInvoices.length === 0 ? (
          <div className="p-4 sm:p-[22px]">
            <EmptyState
              title="No invoices yet"
              description="Your first invoice arrives after the current cycle."
              className="py-10"
            />
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="bg-bg text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
                <th scope="col" className="px-4 py-2.5 font-bold sm:px-[22px]">
                  Date
                </th>
                <th scope="col" className="px-2 py-2.5 font-bold">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold sm:px-[22px]">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sortedInvoices.map((invoice) => (
                <tr key={invoice.id} className="transition-colors hover:bg-bg">
                  <td className="px-4 py-3.5 font-semibold text-ink sm:px-[22px]">
                    {formatDate(invoice.date)}
                  </td>
                  <td className="px-2 py-3.5">
                    <Badge tone={invoice.status === "paid" ? "success" : "default"}>
                      {capitalize(invoice.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-ink sm:px-[22px]">
                    {currency.format(invoice.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </SettingsShell>
  );
}
