import type { Icon } from "@phosphor-icons/react";
import { CalendarDots, Kanban, SlackLogo, SquaresFour } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge";
import { FormSubmit } from "@/components/admin/FormSubmit";
import { Note, SectionCard } from "@/components/settings/primitives";
import { connectProvider, disconnectProvider } from "@/app/actions/integrations";
import {
  cardState,
  scopeLabel,
  trackerOptions,
  type CardState,
  type IntegrationItem,
  type ProviderKey,
  type ReturnBanner,
  type TrackerOption,
} from "@/lib/integrations";
import type { IntegrationsLoad } from "@/lib/api/integrations";

/* Integration connections (Phase P12, plan 3.14, guardrail R8): Google Calendar, Slack, and ONE
   project tracker chosen with a single radio (Jira, with Linear shown as not available). Every
   figure comes from integration-service's `GET /integrations`; a provider without app credentials
   on the server is "Not configured" and cannot be connected. No token is ever shown: the server
   never returns one and the view model has no field for it.

   Server component. Connect and Disconnect are form actions, so they work without client JS;
   only the submit buttons are client islands (pending label, confirm step). */

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? dateTime.format(new Date(iso)) : null);

type CardMeta = { key: ProviderKey; name: string; description: string; icon: Icon };

const CARDS: CardMeta[] = [
  {
    key: "google_calendar",
    name: "Google Calendar",
    description: "Meetings on the installer's primary calendar sync in, with attendees matched to people in this workspace, so agents can prepare before you join.",
    icon: CalendarDots,
  },
  {
    key: "slack",
    name: "Slack",
    description: "Prep briefs before a meeting, summaries after it and action reminders arrive as direct messages from the Mytheus app.",
    icon: SlackLogo,
  },
];

function StatusBadge({ state }: { state: CardState }) {
  if (state.kind === "not_configured") return <Badge>Not configured</Badge>;
  if (state.kind === "available") return <Badge>Not connected</Badge>;
  return state.status === "active" ? <Badge tone="success">Connected</Badge> : <Badge tone="warning">Needs attention</Badge>;
}

function Details({ item, people }: { item: IntegrationItem; people: Map<string, string> }) {
  const rows: [string, string][] = [];
  if (item.external_account_id) rows.push(["Account", item.external_account_id]);
  if (item.installed_by) rows.push(["Installed by", people.get(item.installed_by) ?? "A former member"]);
  const installed = fmt(item.installed_at);
  if (installed) rows.push(["Installed", installed]);
  rows.push(["Last sync", fmt(item.last_synced_at) ?? "Not synced yet"]);
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-ctl border border-line bg-surface-2 px-3.5 py-3 text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-3">{k}</dt>
            <dd className="truncate text-right font-semibold text-ink" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
      {item.scopes.length > 0 ? (
        <div>
          <p className="kicker">Permissions granted</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {item.scopes.map((s) => (
              <li key={s} title={s}>
                <Badge>{scopeLabel(s)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Actions({ provider, name, state, connectBlocked }: { provider: ProviderKey; name: string; state: CardState; connectBlocked?: string | null }) {
  if (state.kind === "connected") {
    return (
      <form action={disconnectProvider}>
        <input type="hidden" name="provider" value={provider} />
        <FormSubmit destructive confirmLabel="Confirm disconnect" pendingLabel="Disconnecting..." ariaLabel={`Disconnect ${name}`}>
          Disconnect
        </FormSubmit>
      </form>
    );
  }
  const disabled = state.kind === "not_configured" || !!connectBlocked;
  return (
    <form action={connectProvider}>
      <input type="hidden" name="provider" value={provider} />
      <FormSubmit variant="primary" disabled={disabled} pendingLabel="Opening..." ariaLabel={`Connect ${name}`}>
        Connect
      </FormSubmit>
    </form>
  );
}

function ProviderCard({ meta, item, people }: { meta: CardMeta; item: IntegrationItem | undefined; people: Map<string, string> }) {
  const state = cardState(item);
  const Glyph = meta.icon;
  return (
    <li className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-warm-1 sm:px-[22px]">
      <div className="flex items-start gap-3.5">
        <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink" aria-hidden="true">
          <Glyph size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold leading-snug text-ink">{meta.name}</h3>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-3">{meta.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge state={state} />
      </div>
      {state.kind === "not_configured" ? (
        <p className="text-[13.5px] text-ink-3">The server has no app credentials for {meta.name} yet, so it cannot be connected.</p>
      ) : null}
      {state.kind === "connected" && state.status === "degraded" ? (
        <Note tone="warning">The connection is failing at {meta.name}. Disconnect and connect again to repair it.</Note>
      ) : null}
      {item && state.kind === "connected" ? <Details item={item} people={people} /> : null}
      <div className="mt-auto border-t border-line pt-4">
        <Actions provider={meta.key} name={meta.name} state={state} />
      </div>
    </li>
  );
}

const REASON_COPY: Record<NonNullable<TrackerOption["reason"]>, string> = {
  not_available: "Not available",
  not_configured: "Not configured",
  other_tracker_connected: "Another tracker is connected",
  connected: "Connected",
};

function TrackerSection({ items, people }: { items: Map<ProviderKey, IntegrationItem>; people: Map<string, string> }) {
  const options = trackerOptions(items);
  const jira = items.get("jira");
  const jiraState = cardState(jira);
  const jiraOption = options.find((o) => o.key === "jira")!;
  return (
    <SectionCard
      title="Project tracker"
      description="One tracker per workspace. Only action items someone has confirmed become issues, and an issue closed in the tracker marks the action done here."
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-[22px] md:py-[18px]">
        <fieldset className="grid gap-2.5">
          <legend className="sr-only">Project tracker</legend>
          {options.map((o) => {
            const OptionIcon = o.key === "jira" ? SquaresFour : Kanban;
            return (
              <label
                key={o.key}
                className={`flex flex-wrap items-start gap-3 rounded-ctl border border-line-2 bg-surface px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-150 has-[:checked]:border-signal has-[:checked]:bg-surface-2 has-[:checked]:shadow-[0_0_0_1px_var(--signal)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                  o.selectable ? "cursor-pointer hover:border-ink-4 hover:bg-surface-2" : "cursor-not-allowed bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  name="pm-tracker"
                  value={o.key}
                  defaultChecked={o.selected}
                  disabled={!o.selectable}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-ink-3 peer-checked:border-signal peer-disabled:border-line-2 [&>span]:hidden peer-checked:[&>span]:block"
                >
                  <span className="h-2 w-2 rounded-full bg-signal" />
                </span>
                <OptionIcon size={20} className="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
                <span className="min-w-0 flex-[1_1_12rem]">
                  <span className={`block text-[15px] font-semibold ${o.selectable ? "text-ink" : "text-ink-3"}`}>{o.name}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-3">
                    {o.key === "jira"
                      ? "Confirmed action items become Jira issues, with a link back to the meeting."
                      : "Linear is not supported yet."}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-1.5">
                  {o.reason && o.reason !== "connected" ? <Badge>{REASON_COPY[o.reason]}</Badge> : null}
                  {o.key === "jira" ? <StatusBadge state={jiraState} /> : null}
                </span>
              </label>
            );
          })}
        </fieldset>

        {jiraOption.reason === "other_tracker_connected" ? (
          <Note tone="warning">Another project tracker is connected. Disconnect it before connecting Jira.</Note>
        ) : null}
        {jiraState.kind === "connected" && jiraState.status === "degraded" ? (
          <Note tone="warning">The connection is failing at Jira. Disconnect and connect again to repair it.</Note>
        ) : null}
        {jira && jiraState.kind === "connected" ? <Details item={jira} people={people} /> : null}

        <div className="border-t border-line pt-4">
          <Actions
            provider="jira"
            name="Jira"
            state={jiraState}
            connectBlocked={jiraOption.canConnect || jiraState.kind === "connected" ? null : jiraOption.reason}
          />
        </div>
      </div>
    </SectionCard>
  );
}

export function IntegrationsPanel({
  load,
  banner,
  people,
}: {
  load: IntegrationsLoad;
  banner: ReturnBanner;
  /** internal user id -> display name, for "Installed by" */
  people: Map<string, string>;
}) {
  return (
    <>
      {banner ? (
        <div aria-live="polite">
          <Note tone={banner.tone === "error" ? "error" : banner.tone === "success" ? "success" : "info"}>{banner.message}</Note>
        </div>
      ) : null}

      {load.kind === "forbidden" ? (
        <Note>Only workspace owners and admins can see and manage integrations.</Note>
      ) : load.kind === "unavailable" ? (
        <Note tone="warning">Integrations could not be loaded from the server just now, so nothing can be connected. Try again in a moment.</Note>
      ) : (
        <>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5">
            {CARDS.map((c) => (
              <ProviderCard key={c.key} meta={c} item={load.items.get(c.key)} people={people} />
            ))}
          </ul>
          <TrackerSection items={load.items} people={people} />
        </>
      )}
    </>
  );
}
