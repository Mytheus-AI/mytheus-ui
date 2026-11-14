import type { Metadata } from "next";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { SectionCard, cardPad } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { PageHead } from "@/components/ui/Page";
import { BarList } from "@/components/ops/charts";
import { KpiStrip, LatencyPlot } from "@/components/ops/viz/Figures";
import { RefreshButton } from "@/components/ops/RefreshButton";
import { loadHealth } from "@/lib/api/admin-ops";
import { healthSummary } from "@/lib/ops";
import { zonedFormat } from "@/lib/timezone-server";

export const metadata: Metadata = { title: "Health | Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* Service health (ADR-0046 D3): each backend service's /healthz, probed from admin-ops-service
   on the internal network, and the transactional outbox's unpublished backlog. Status always
   carries a word and an icon beside its colour. Dead letters and consumer lag are read from
   Redpanda by admin-ops-service; when it cannot answer, the page says so. */

const whole = new Intl.NumberFormat("en-US");
const SELF = "admin-ops-service";

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
  const title = "Health";
  if (res.kind !== "live") {
    return (
      <>
        <PageHead title={title} context="Backend services and the event outbox." />
        {res.kind === "forbidden" ? <Note tone="error">This account is not on the Mytheus staff list.</Note> : <ErrorState title="Health could not be checked" />}
      </>
    );
  }

  const h = res.data;
  const { up, down } = healthSummary(h.services);
  const checked = Date.parse(h.checked_at);
  const now = Number.isFinite(checked) ? checked : Date.now();
  const time = zonedFormat({ hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(now));
  const downNames = h.services.filter((s) => s.status !== "up").map((s) => s.service);
  const answered = h.services.filter((s) => s.status === "up" && s.service !== SELF && s.latency_ms !== null).map((s) => s.latency_ms as number);
  const slowest = answered.length ? Math.max(...answered) : null;
  const median = answered.length ? [...answered].sort((a, b) => a - b)[Math.floor((answered.length - 1) / 2)] : null;
  // Down first, then slowest first: the eye lands on what needs it.
  const probes = [...h.services]
    .sort((a, b) => Number(a.status === "up") - Number(b.status === "up") || (b.latency_ms ?? -1) - (a.latency_ms ?? -1))
    .map((s) => ({
      service: s.service,
      up: s.status === "up",
      ms: s.service === SELF ? null : s.latency_ms,
      note: s.service === SELF ? "This service" : undefined,
      detail: s.detail ?? null,
    }));

  return (
    <>
      <PageHead title={title} context="Backend services and the event outbox, probed from the ops service on the internal network." action={<RefreshButton readAt={time} />} />

      <div className="flex flex-col gap-5 xl:gap-6">
        <div
          role="status"
          className={`flex items-center gap-3 rounded-card border px-4 py-3.5 sm:px-[22px] ${
            down ? "border-[color:color-mix(in_srgb,var(--priority-high)_30%,var(--line))] bg-priority-high-soft" : "border-line bg-surface shadow-warm-1"
          }`}
        >
          {down ? (
            <WarningCircle size={22} weight="fill" className="shrink-0 text-priority-high" aria-hidden />
          ) : (
            <CheckCircle size={22} weight="fill" className="shrink-0 text-ok" aria-hidden />
          )}
          <p className="min-w-0 text-[15px] text-ink-2">
            {down ? (
              <>
                <span className="font-semibold text-priority-high">{down === 1 ? "One service is not answering" : `${down} services are not answering`}</span>: {downNames.join(", ")}.
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">All {h.services.length} services are answering.</span> Checked at {time}.
              </>
            )}
          </p>
        </div>

        <KpiStrip
          label="Health figures"
          items={[
            { label: "Services up", value: `${up} of ${h.services.length}`, hint: down ? `${down} down` : "All answering" },
            {
              label: "Typical response",
              value: median === null ? "None" : `${whole.format(median)} ms`,
              hint: slowest === null ? "No service answered" : `Slowest ${whole.format(slowest)} ms`,
            },
            { label: "Events waiting to publish", value: whole.format(h.outbox_pending), hint: `Oldest: ${age(h.outbox_oldest_pending_at, now)}` },
            { label: "Most retries on one event", value: whole.format(h.outbox_max_attempts), hint: h.outbox_max_attempts >= 3 ? "Worth a look" : "Nothing stuck" },
          ]}
        />

        <SectionCard
          title="Services"
          headingId="services-heading"
          description="Each service's health endpoint, with its response time on one scale. Down first, then slowest first; the probe gives up after 2 seconds."
        >
          <div className={cardPad}>
            <LatencyPlot probes={probes} />
          </div>
        </SectionCard>

        <div className="grid gap-5 lg:grid-cols-2 xl:gap-6">
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
          <SectionCard title="Queues and lag" headingId="queues-heading" description="Dead letters set aside per queue, then how far each consumer group is behind, read from Redpanda.">
            <div className={`${cardPad} flex flex-col gap-6`}>
              {h.dlq === null || h.consumer_lag === null ? (
                <p className="text-[14px] leading-relaxed text-ink-3">
                  Redpanda did not answer just now, so these could not be counted. Refresh to try again.
                </p>
              ) : (
                <>
                  <BarList
                    caption="Dead letters per queue"
                    empty="No dead letters. Every message was processed."
                    items={h.dlq
                      .filter((x) => x.count > 0)
                      .map((x) => ({ key: x.topic, label: x.topic, value: x.count, tone: "high" as const }))}
                  />
                  <BarList
                    caption="Consumer lag per group"
                    empty="Every consumer group is caught up."
                    items={h.consumer_lag
                      .filter((x) => x.lag > 0)
                      .slice(0, 10)
                      .map((x) => ({
                        key: `${x.group}|${x.topic}`,
                        label: x.group,
                        value: x.lag,
                        note: x.topic,
                        tone: x.lag >= 1000 ? ("medium" as const) : ("default" as const),
                      }))}
                  />
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
