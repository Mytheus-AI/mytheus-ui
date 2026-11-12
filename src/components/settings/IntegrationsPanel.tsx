import type { Icon } from "@phosphor-icons/react";
import { BookOpenText, CalendarDots, Kanban, NotionLogo, SlackLogo } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { FormSubmit } from "@/components/admin/FormSubmit";
import { cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { ClampedText } from "./ClampedText";
import { IntegrationSetup } from "./IntegrationSetup";
import { ReturnToast } from "./ReturnToast";
import { connectProvider, disconnectProvider } from "@/app/actions/integrations";
import {
  SETUP_GUIDES,
  VIEW_CHIP,
  callbackUrl,
  decisionChecksCopy,
  providerView,
  trackerOptions,
  type IntegrationItem,
  type ProviderKey,
  type ProviderView,
  type ReturnBanner,
} from "@/lib/integrations";
import type { IntegrationsLoad } from "@/lib/api/integrations";

/* Settings > Integrations (Phase P12 plan 3.14 and Phase 4 reach; redesigned 2026-11-12).

   Six cards in one grid, in two groups: "For your Mytes" (Google Calendar, Slack, the project
   tracker) and "Share and export" (Notion, Confluence). Every card is the same shape: a
   header (icon, status chip), the name, a two-line description with "More", and a footer with
   exactly one action. Each card has exactly one chip, for one of five states:

     Connected         account and last sync; Disconnect
     Ready to connect  the server has app credentials; Connect starts the OAuth flow
     Needs setup       the server has none; admins get "Set up" (what to create, the redirect
                       URL, the scopes, the env var names), others "Ask an admin to set this up"
     Error             connected but failing at the provider; Reconnect
     Coming soon       Linear, as a disabled segment of the tracker choice (never a chip)

   Every figure comes from integration-service's `GET /integrations`. No token is ever shown: the
   server never returns one and the view model has no field for it. Server component: Connect and
   Disconnect are form actions, so they work without client JS; the submit buttons, the setup
   dialog and "More" are the client islands. */

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? dateTime.format(new Date(iso)) : null);

type CardMeta = { key: Exclude<ProviderKey, "linear">; name: string; description: string; icon: Icon };

const FOR_MYTES: CardMeta[] = [
  {
    key: "google_calendar",
    name: "Google Calendar",
    description: "Meetings on your calendar sync in with their attendees matched to people here, so each Myte can prepare before you join.",
    icon: CalendarDots,
  },
  {
    key: "slack",
    name: "Slack",
    description:
      "Briefs before a meeting, summaries after it and action reminders arrive as Slack messages. A message that goes against a decision is flagged to its writer first.",
    icon: SlackLogo,
  },
];

const TRACKER: CardMeta = {
  key: "jira",
  name: "Project tracker",
  description: "Confirmed action items become issues with a link back to the meeting, and closing an issue marks the action done here. One tracker per workspace.",
  icon: Kanban,
};

const SHARE: CardMeta[] = [
  {
    key: "notion",
    name: "Notion",
    description: "Export a decision record, with what it follows from and what replaced it, as a page under any Notion page you share with Mytheus.",
    icon: NotionLogo,
  },
  {
    key: "confluence",
    name: "Confluence",
    description: "Export a decision record, with its lineage, as a page in a Confluence space of your choice.",
    icon: BookOpenText,
  },
];

/** Everything a card needs besides its own row. */
type Ctx = { canManage: boolean; appOrigin: string; apiOrigin: string; people: Map<string, string> };

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,236px),1fr))] gap-4";

/* ---------------- the card ---------------- */

function Card({
  meta,
  view,
  body,
  footer,
}: {
  meta: { name: string; description: string; icon: Icon };
  view: ProviderView;
  body?: ReactNode;
  footer: ReactNode;
}) {
  const Glyph = meta.icon;
  const chip = VIEW_CHIP[view];
  return (
    <li className={cardClass({ clip: false, className: "flex h-full min-w-0 flex-col" })}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink" aria-hidden="true">
          <Glyph size={22} />
        </span>
        <Chip tone={chip.tone}>
          <span className="sr-only">{meta.name}: </span>
          {chip.label}
        </Chip>
      </div>
      <h4 className="mt-3.5 text-[17px] font-semibold leading-snug text-ink">{meta.name}</h4>
      <ClampedText className="mt-1">{meta.description}</ClampedText>
      {body ? <div className="mt-3.5 flex flex-col gap-2.5">{body}</div> : null}
      <div className="mt-auto flex min-h-9 flex-wrap items-center gap-2 pt-4">{footer}</div>
    </li>
  );
}

/** Account and last sync, for a connected card. */
function Details({ item, people }: { item: IntegrationItem; people: Map<string, string> }) {
  const installer = item.installed_by ? (people.get(item.installed_by) ?? "a former member") : null;
  const rows: [string, string][] = [];
  if (item.external_account_id) rows.push(["Account", item.external_account_id]);
  rows.push(["Last sync", fmt(item.last_synced_at) ?? "Not synced yet"]);
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-ctl bg-surface-2 px-3 py-2.5 text-[13.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="truncate text-right font-semibold text-ink" title={k === "Account" && installer ? `${v}, connected by ${installer}` : v}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const Quiet = ({ children }: { children: ReactNode }) => <p className="text-[14px] leading-snug text-ink-3">{children}</p>;

/** The state's detail between the description and the footer; nothing for "Ready" and "Needs setup". */
function bodyFor(view: ProviderView, name: string, item: IntegrationItem | undefined, ctx: Ctx): ReactNode {
  if ((view === "connected" || view === "error") && item) {
    const checks = item.provider === "slack" ? decisionChecksCopy(item.decision_checks) : null;
    return (
      <>
        {view === "error" ? <Note tone="warning">Failing at {name}. Reconnect to repair it.</Note> : null}
        <Details item={item} people={ctx.people} />
        {checks && view === "connected" ? <Quiet>{checks.label}</Quiet> : null}
      </>
    );
  }
  if (view === "blocked") return <Quiet>Another project tracker is connected. Disconnect it before connecting Jira.</Quiet>;
  return null;
}

/** The one footer action for a state. */
function actionFor(view: ProviderView, provider: Exclude<ProviderKey, "linear">, name: string, ctx: Ctx): ReactNode {
  if (!ctx.canManage || view === "unknown") {
    return <Quiet>{view === "connected" ? "Connected by a workspace admin" : "Ask an admin to set this up"}</Quiet>;
  }
  if (view === "connected") {
    return (
      <form action={disconnectProvider}>
        <input type="hidden" name="provider" value={provider} />
        <FormSubmit destructive confirmLabel="Confirm disconnect" pendingLabel="Disconnecting..." ariaLabel={`Disconnect ${name}`}>
          Disconnect
        </FormSubmit>
      </form>
    );
  }
  if (view === "ready" || view === "error") {
    const verb = view === "error" ? "Reconnect" : "Connect";
    return (
      <form action={connectProvider}>
        <input type="hidden" name="provider" value={provider} />
        <FormSubmit variant="primary" pendingLabel="Opening..." ariaLabel={`${verb} ${name}`}>
          {verb}
        </FormSubmit>
      </form>
    );
  }
  if (view === "needs_setup") {
    return <IntegrationSetup name={name} guide={SETUP_GUIDES[provider]} redirectUrl={callbackUrl(ctx.appOrigin, provider)} apiOrigin={ctx.apiOrigin} />;
  }
  return <Quiet>Disconnect the other tracker first</Quiet>;
}

function viewFor(load: IntegrationsLoad, provider: ProviderKey, opts?: { otherTrackerConnected?: boolean }): ProviderView {
  return load.kind === "live" ? providerView(load.items.get(provider), opts) : "unknown";
}

function ProviderCard({ meta, load, ctx }: { meta: CardMeta; load: IntegrationsLoad; ctx: Ctx }) {
  const item = load.kind === "live" ? load.items.get(meta.key) : undefined;
  const view = viewFor(load, meta.key);
  return <Card meta={meta} view={view} body={bodyFor(view, meta.name, item, ctx)} footer={actionFor(view, meta.key, meta.name, ctx)} />;
}

/* ---------------- the project tracker ---------------- */

/** Jira or Linear, as a two-segment choice. Linear is not built: a disabled segment marked
    "Coming soon", never a second chip (R8: one tracker; Linear is never connectable). */
function TrackerChoice() {
  return (
    <fieldset className="w-full min-w-0">
      <legend className="sr-only">Tracker</legend>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-1 rounded-full bg-bg-2 p-1">
        <label className="flex h-8 cursor-pointer items-center justify-center rounded-full px-4 text-[14px] font-semibold text-ink-2 transition-[background-color,color,box-shadow] duration-150 has-[:checked]:bg-surface has-[:checked]:text-ink has-[:checked]:shadow-warm-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal">
          <input type="radio" name="pm-tracker" value="jira" defaultChecked className="sr-only" />
          Jira
        </label>
        <label className="flex h-8 min-w-0 cursor-not-allowed items-center justify-center gap-1.5 rounded-full px-3 text-[14px] text-ink-3">
          <input type="radio" name="pm-tracker" value="linear" disabled aria-describedby="linear-soon" className="sr-only" />
          <span className="font-semibold">Linear</span>
          <span id="linear-soon" className="truncate text-[13px]">
            Coming soon
          </span>
        </label>
      </div>
    </fieldset>
  );
}

function TrackerCard({ load, ctx }: { load: IntegrationsLoad; ctx: Ctx }) {
  const jira = load.kind === "live" ? load.items.get("jira") : undefined;
  const otherTrackerConnected = load.kind === "live" && trackerOptions(load.items)[0].reason === "other_tracker_connected";
  const view = viewFor(load, "jira", { otherTrackerConnected });
  return (
    <Card
      meta={TRACKER}
      view={view}
      body={bodyFor(view, "Jira", jira, ctx)}
      footer={
        <>
          <TrackerChoice />
          {actionFor(view, "jira", "Jira", ctx)}
        </>
      }
    />
  );
}

/* ---------------- the page body ---------------- */

function Group({ id, title, lead, children }: { id: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div>
        <h3 id={id} className="display text-[20px] text-ink-display">
          {title}
        </h3>
        <p className="mt-0.5 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-3">{lead}</p>
      </div>
      <ul className={GRID}>{children}</ul>
    </section>
  );
}

export function IntegrationsPanel({
  load,
  banner,
  people,
  canManage,
  appOrigin,
  apiOrigin,
}: {
  load: IntegrationsLoad;
  banner: ReturnBanner;
  /** internal user id -> display name, for "Connected by" */
  people: Map<string, string>;
  /** a workspace owner or admin: may connect, disconnect and set up */
  canManage: boolean;
  /** this app's origin, for the OAuth redirect URL shown in setup */
  appOrigin: string;
  /** the API origin, for Slack's event and interactivity URLs */
  apiOrigin: string;
}) {
  const ctx: Ctx = { canManage: canManage && load.kind !== "forbidden", appOrigin, apiOrigin, people };

  if (load.kind === "unavailable") {
    return <ErrorState title="Integrations could not be loaded" text="Nothing was changed. Connected tools keep working while this page is unavailable." />;
  }
  if (load.kind === "live" && load.items.size === 0) {
    return (
      <EmptyState
        title="No integrations on this server"
        description="This Mytheus server lists no tools to connect. Once integration-service is deployed, Google Calendar, Slack, Jira, Notion and Confluence appear here."
      />
    );
  }

  const nothingConfigured = load.kind === "live" && Array.from(load.items.values()).every((i) => !i.configured && i.status === null);

  return (
    <>
      {banner && banner.tone !== "error" ? <ReturnToast message={banner.message} /> : null}
      {banner?.tone === "error" ? <Note tone="error">{banner.message}</Note> : null}

      {!ctx.canManage ? (
        <Note>Only workspace admins can connect integrations. Exporting a decision to Notion, Confluence or Slack works for everyone once it is connected.</Note>
      ) : nothingConfigured ? (
        <Note>Nothing is set up on this server yet. Choose Set up on any tool to see the app to create and the keys the server needs.</Note>
      ) : null}

      <Group id="for-mytes" title="For your Mytes" lead="What each Myte reads before a meeting and where it reports after.">
        {FOR_MYTES.map((m) => (
          <ProviderCard key={m.key} meta={m} load={load} ctx={ctx} />
        ))}
        <TrackerCard load={load} ctx={ctx} />
      </Group>

      <Group id="share-export" title="Share and export" lead="Send what the workspace confirmed to the tools other people already read. Each one is optional.">
        {SHARE.map((m) => (
          <ProviderCard key={m.key} meta={m} load={load} ctx={ctx} />
        ))}
      </Group>
    </>
  );
}
