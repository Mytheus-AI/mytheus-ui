import type { Metadata } from "next";
import { mockBilling } from "@/lib/mock/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Billing — Mytheus",
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(`${iso}T00:00:00Z`));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BillingPage() {
  const { plan, seatsUsed, seatsTotal, pricePerSeat, billingCycle, nextInvoiceDate, nextInvoiceAmount, invoices } =
    mockBilling;

  const seatPct = Math.min(100, Math.round((seatsUsed / seatsTotal) * 100));
  const sortedInvoices = [...invoices].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-3xl">
      <p className="kicker">Billing</p>
      <h1 className="mt-2 text-[28px] font-medium tracking-tight text-ink-display">
        Plan &amp; billing
      </h1>

      <div className="mt-8 flex flex-col gap-6">
        {/* Current plan */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-wide text-ink-3">Current plan</p>
              <p className="mt-1 text-[20px] font-medium text-ink-display">{capitalize(plan)}</p>
            </div>
            <Button variant="outline" size="sm">
              Change plan
            </Button>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[13px] text-ink-2">
              <span>
                {seatsUsed} of {seatsTotal} seats used
              </span>
              <span>{seatPct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-bg-2">
              <div className="h-full rounded-pill bg-signal" style={{ width: `${seatPct}%` }} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-ink-2">
            <span>
              <span className="text-ink-3">Price per seat: </span>
              {currency.format(pricePerSeat)}/seat
            </span>
            <span>
              <span className="text-ink-3">Billing cycle: </span>
              {capitalize(billingCycle)}
            </span>
          </div>
        </Card>

        {/* Next invoice */}
        <Card>
          <p className="text-[13px] font-medium uppercase tracking-wide text-ink-3">Next invoice</p>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <p className="text-[20px] font-medium text-ink-display">{formatDate(nextInvoiceDate)}</p>
            <p className="text-[20px] font-medium text-ink-display">
              {currency.format(nextInvoiceAmount)}
            </p>
          </div>
        </Card>

        {/* Invoice history */}
        <Card>
          <p className="text-[13px] font-medium uppercase tracking-wide text-ink-3">Invoice history</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-4 font-medium text-ink-3">
                    Date
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium text-ink-3">
                    Amount
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium text-ink-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-line-2 last:border-b-0">
                    <td className="py-3 pr-4 text-ink">{formatDate(invoice.date)}</td>
                    <td className="py-3 pr-4 text-ink">{currency.format(invoice.amount)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={invoice.status === "paid" ? "success" : "default"}>
                        {capitalize(invoice.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
