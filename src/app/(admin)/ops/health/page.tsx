import type { Metadata } from "next";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { StatCard, theadRowClass, thClass } from "@/components/admin/StatCard";
import { BarList } from "@/components/ops/charts";
import { SectionCard, cardPad } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { loadHealth } from "@/lib/api/admin-ops";
import { healthSummary } from "@/lib/ops";

export const metadata: Metadata = { title: "Health | Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* Service health (ADR-0046 D3): each backend service's /healthz, probed from admin-ops-service
   on the internal network, and the transactional outbox's unpublished backlog. Status always
   carries a word and an icon beside its colour. Dead letters and consumer lag live in Redpanda
   and Prometheus, which the ops service cannot read yet, and the page says so. */

const whole = new Intl.NumberFormat("en-US");
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

function age(iso: string | null, now: number): string {
  if (!iso) return "None waiting";
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "Just now";
  const m = Math.round(ms / 60000);
  if (m < 1) return "Under a minute";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
}

export default async function OpsHealthPage() {
  const res = await loadHealth();
  if (res.kind !== "live") {
    return (
      <div className="flex flex-col gap-5">
        <SectionBar title="Health" context="Backend services and the event outbox." />
        {res.kind === "forbidden" ? (
          <Note tone="error">This account is not on the Mytheus staff list.</Note>
        ) : (
          <ErrorState title="Health could not be checked" />
        )}
      </div>
    );
  }

  const h = res.data;
  const { up, down } = healthSummary(h.services);
  const checked = Date.parse(h.checked_at);
  const now = Number.isFinite(checked) ? checked : Date.now();

  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Health"
        context={`Backend services and the event outbox, checked ${Number.isFinite(checked) ? `at ${time.format(new Date(checked))}` : "just now"}. Reload to check again.`}
      />

      {down > 0 ? (
        <Note tone="error">
          {down === 1 ? "One service is" : `${down} services are`} not answering: {h.services.filter((s) => s.status !== "up").map((s) => s.service).join(", ")}.
        </Note>
      ) : null}

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Services up" value={`${up} of ${h.services.length}`} hint={down ? `${down} down` : "All answering"} />
        <StatCard label="Events waiting to publish" value={whole.format(h.outbox_pending)} hint={`Oldest: ${age(h.outbox_oldest_pending_at, now)}`} />
        <StatCard label="Most retries on one event" value={whole.format(h.outbox_max_attempts)} hint={h.outbox_max_attempts >= 3 ? "Worth a look" : "Nothing stuck"} />
      </div>

      <SectionCard title="Services" headingId="services-heading" description="Each service's health endpoint, called from the ops service with a 2 second limit.">
        <table className="mx-table w-full border-collapse text-left text-[14px]">
          <caption className="sr-only">Backend services with status and response time</caption>
          <thead>
            <tr className={theadRowClass}>
              <th scope="col" className={`${thClass} !pl-[22px]`}>Service</th>
              <th scope="col" className={thClass}>Status</th>
              <th scope="col" className={`${thClass} text-right !pr-[22px]`}>Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {h.services.map((s) => (
              <tr key={s.service}>
                <th scope="row" className="py-3 pl-[22px] pr-5 text-left font-mono text-[14px] font-normal text-ink">
                  {s.service}
                </th>
                <td data-label="Status" className="px-5 py-3">
                  {s.status === "up" ? (
                    <Chip tone="ok">
                      <CheckCircle size={14} weight="fill" aria-hidden /> Up
                    </Chip>
                  ) : (
                    <Chip tone="high">
                      <WarningCircle size={14} weight="fill" aria-hidden /> Down{s.detail ? `, ${s.detail}` : ""}
                    </Chip>
                  )}
                </td>
                <td data-label="Response" className="py-3 pl-5 pr-[22px] text-right tabular-nums text-ink-2">
                  {s.service === "admin-ops-service" ? "This service" : s.latency_ms === null ? "No answer" : `${whole.format(s.latency_ms)} ms`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Outbox backlog by workspace" headingId="outbox-heading" description="Events written but not yet published to Redpanda. A growing number means the relay is behind.">
          <div className={cardPad}>
            <BarList
              caption="Unpublished events per workspace"
              empty="Nothing waiting. Every event has been published."
              items={h.outbox_tenants.map((r) => ({
                key: r.org_id,
                label: r.name,
                value: r.pending,
                note: `oldest ${age(r.oldest_pending_at, now)}${r.max_attempts ? `, ${r.max_attempts} retries` : ""}`,
                tone: r.max_attempts >= 3 ? "medium" : "default",
              }))}
            />
          </div>
        </SectionCard>
        <SectionCard title="Queues and lag" headingId="queues-heading" description="Dead-letter queues and consumer lag.">
          <p className={`${cardPad} text-[14px] leading-relaxed text-ink-3`}>
            Not readable from the ops service yet. Both live in Redpanda and Prometheus, which this service cannot reach. Use Grafana on the server for now.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
