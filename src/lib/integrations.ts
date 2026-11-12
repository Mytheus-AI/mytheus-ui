/**
 * Integration settings, as pure functions (Phase P12, plan 3.14, P12 contract sections 0 and 3).
 *
 * Guardrail R8: Google Calendar, Slack, and ONE project tracker. The tracker is a single radio:
 * Jira is the one that is built and is selected; Linear is shown as an option that is not
 * available, so its Connect can never be pressed. A provider the server has no app credentials
 * for is "Not configured" and cannot be connected either.
 *
 * Nothing in here ever sees token material: the server's list carries status, scopes and who
 * installed it, never a token, and the view model below has no field a token could land in.
 * Pure so it can be tested without a server.
 */

export type ProviderKey = "google_calendar" | "slack" | "jira" | "linear" | "hubspot" | "notion" | "confluence";
export type TrackerKey = "jira" | "linear";
export type ConnectionStatus = "active" | "degraded" | "disconnected";

/** One row of `GET /integrations`, as the contract defines it. */
export interface IntegrationItem {
  provider: string;
  configured: boolean;
  status: ConnectionStatus | null;
  scopes: string[];
  external_account_id: string | null;
  installed_by: string | null;
  installed_at: string | null;
  last_synced_at: string | null;
  /** Slack only (decisions that follow you): checking channel messages against decisions is on,
   *  or the install predates the message-reading permissions and must be reconnected. */
  decision_checks?: DecisionChecks | null;
}

export type DecisionChecks = "on" | "needs_reconnect";

export const PROVIDERS: readonly ProviderKey[] = ["google_calendar", "slack", "jira", "linear", "hubspot", "notion", "confluence"];
export const CONNECTABLE: readonly ProviderKey[] = ["google_calendar", "slack", "jira", "hubspot", "notion", "confluence"];
/** Phase 4 reach: the CRM a meeting note goes to, and the two tools a decision record can be
 *  exported to. Outside R8, so connecting one never blocks another. */
export const REACH: readonly ProviderKey[] = ["hubspot", "notion", "confluence"];

export const PROVIDER_NAME: Record<ProviderKey, string> = {
  google_calendar: "Google Calendar",
  slack: "Slack",
  jira: "Jira",
  linear: "Linear",
  hubspot: "HubSpot",
  notion: "Notion",
  confluence: "Confluence",
};

export function isProvider(v: unknown): v is ProviderKey {
  return typeof v === "string" && (PROVIDERS as readonly string[]).includes(v);
}

/** Only these can ever be connected; Linear is not built (R8, contract section 0). */
export function isConnectable(v: unknown): v is ProviderKey {
  return typeof v === "string" && (CONNECTABLE as readonly string[]).includes(v);
}

/** What a card shows, derived from one server row (or its absence). */
export type CardState =
  | { kind: "not_configured" }
  | { kind: "available" }
  | { kind: "connected"; status: "active" | "degraded" };

export function cardState(item: IntegrationItem | undefined): CardState {
  if (!item || !item.configured) return { kind: "not_configured" };
  if (item.status === "active" || item.status === "degraded") return { kind: "connected", status: item.status };
  return { kind: "available" };
}

/** Keep only fields we render, and only for providers we know. A token field the server might
 *  mistakenly add is dropped here rather than passed on to a component. */
export function normalizeIntegrations(raw: unknown): Map<ProviderKey, IntegrationItem> {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];
  const out = new Map<ProviderKey, IntegrationItem>();
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (!isProvider(o.provider)) continue;
    const status = o.status === "active" || o.status === "degraded" || o.status === "disconnected" ? o.status : null;
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);
    out.set(o.provider, {
      provider: o.provider,
      configured: o.configured === true,
      status,
      scopes: Array.isArray(o.scopes) ? o.scopes.filter((s): s is string => typeof s === "string") : [],
      external_account_id: str(o.external_account_id),
      installed_by: str(o.installed_by),
      installed_at: str(o.installed_at),
      last_synced_at: str(o.last_synced_at),
      decision_checks: o.decision_checks === "on" || o.decision_checks === "needs_reconnect" ? o.decision_checks : null,
    });
  }
  return out;
}

/** One option of the project-tracker radio. */
export interface TrackerOption {
  key: TrackerKey;
  name: string;
  /** Selectable at all (Linear never is). */
  selectable: boolean;
  /** The radio's current choice. */
  selected: boolean;
  /** Connect may be pressed: selected, configured, not yet connected, and no other tracker connected. */
  canConnect: boolean;
  /** Why Connect is off, when it is. */
  reason: "not_available" | "not_configured" | "other_tracker_connected" | "connected" | null;
}

/**
 * The R8 single radio. Jira is the only built tracker, so it is always the selected option and
 * Linear is always shown disabled as "Not available". Selecting Jira disables Linear's Connect
 * (plan 3.14 acceptance). If the server ever reports a Linear connection (not built, but the
 * canon enum allows it), Jira's Connect turns off too: one tracker per workspace.
 */
export function trackerOptions(items: Map<ProviderKey, IntegrationItem>): TrackerOption[] {
  const jira = items.get("jira");
  const linear = items.get("linear");
  const connected = (i: IntegrationItem | undefined) => i?.status === "active" || i?.status === "degraded";
  const jiraConnected = connected(jira);
  const linearConnected = connected(linear);

  let jiraReason: TrackerOption["reason"] = null;
  if (jiraConnected) jiraReason = "connected";
  else if (linearConnected) jiraReason = "other_tracker_connected";
  else if (!jira?.configured) jiraReason = "not_configured";

  return [
    { key: "jira", name: "Jira", selectable: true, selected: true, canConnect: jiraReason === null, reason: jiraReason },
    { key: "linear", name: "Linear", selectable: false, selected: false, canConnect: false, reason: "not_available" },
  ];
}

/** The banner after the OAuth round trip (`?connected={provider}` or `?error=...`), or after
 *  Disconnect (`?disconnected={provider}`). */
export type ReturnBanner =
  | { tone: "success"; provider: ProviderKey; message: string }
  | { tone: "info"; provider: ProviderKey; message: string }
  | { tone: "error"; message: string }
  | null;

const ERROR_COPY: Record<string, string> = {
  access_denied: "The connection was cancelled at the provider. Nothing was connected.",
  invalid_state: "The connection link was not valid. Start again from Connect.",
  state_expired: "The connection took longer than 10 minutes. Start again from Connect.",
  exchange_failed: "The provider did not complete the connection. Try again in a moment.",
  not_configured: "This provider is not configured on the server yet, so it cannot be connected.",
  provider_not_configured: "This provider is not configured on the server yet, so it cannot be connected.",
  pm_already_connected: "A project tracker is already connected. Disconnect it before connecting another.",
  post_install_failed: "The connection was saved, but setup at the provider did not finish. Disconnect and connect again.",
  session_expired: "Your session expired. Sign in again, then connect.",
  forbidden: "Only workspace owners and admins can manage integrations.",
  connect_failed: "The connection could not be started just now. Try again in a moment.",
  disconnect_failed: "The integration could not be disconnected just now. Try again in a moment.",
  invalid_provider: "That integration is not available.",
  account_connected_elsewhere: "That account is already connected to another Mytheus workspace. Disconnect it there first, or use a different account.",
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Read the return state from the page's search params. Only known providers produce a success
 * banner; an error code is mapped to fixed copy and never echoed back, so a crafted link cannot
 * put its own words on the page.
 */
export function parseReturnState(params: Record<string, string | string[] | undefined>): ReturnBanner {
  const error = first(params.error);
  if (typeof error === "string" && error) {
    const key = error.trim().toLowerCase();
    return { tone: "error", message: ERROR_COPY[key] ?? "The connection did not complete. Try again from Connect." };
  }
  const connected = first(params.connected);
  if (typeof connected === "string" && isConnectable(connected)) {
    return { tone: "success", provider: connected, message: `${PROVIDER_NAME[connected]} is connected.` };
  }
  const disconnected = first(params.disconnected);
  if (typeof disconnected === "string" && isConnectable(disconnected)) {
    return { tone: "info", provider: disconnected, message: `${PROVIDER_NAME[disconnected]} is disconnected.` };
  }
  return null;
}

/**
 * A URL taken from a server response (the `authorize_url` from `POST
 * /integrations/{provider}/connect`, an export's download link), accepted only if it is https.
 * The server builds it, but a redirect or link target from a response is still checked before
 * the browser is sent there.
 */
export function safeHttpsUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Human labels for the OAuth scopes each provider asks for; anything unknown shows as-is. */
export function scopeLabel(scope: string): string {
  const known: Record<string, string> = {
    "chat:write": "Send messages",
    "users:read": "See people",
    "users:read.email": "See email addresses",
    "im:write": "Open direct messages",
    "channels:history": "Read messages in public channels it is in",
    "groups:history": "Read messages in private channels it is in",
    commands: "Add shortcuts",
    "https://www.googleapis.com/auth/calendar.readonly": "Read calendars",
    "https://www.googleapis.com/auth/calendar.events.readonly": "Read events",
    "https://www.googleapis.com/auth/drive.readonly": "Read files shared to meetings",
    openid: "Sign in",
    email: "See email address",
    "channels:read": "See public channel names",
    "groups:read": "See private channel names",
    "im:history": "Read direct messages it is in",
    "mpim:history": "Read group messages it is in",
    oauth: "Connect",
    "crm.objects.deals.read": "Read deals",
    "read:confluence-content.summary": "See pages",
    "read:jira-work": "Read issues",
    "write:jira-work": "Create and update issues",
    "manage:jira-webhook": "Manage webhooks",
    "read:jira-user": "See people",
    offline_access: "Stay connected",
    "crm.objects.contacts.read": "Read contacts",
    "crm.objects.companies.read": "Read companies",
    "crm.objects.contacts.write": "Add notes to contacts",
    "crm.objects.companies.write": "Add notes to companies",
    "read:confluence-space.summary": "See spaces",
    "write:confluence-content": "Create pages",
  };
  return known[scope] ?? scope;
}

/**
 * The OAuth callback inside the signed-in app (`/settings/integrations/callback/{provider}`).
 * The provider sends the browser back with `?code=&state=` or `?error=`; the page hands code and
 * state to integration-service (`POST /oauth/{provider}`) under the caller's own session, so the
 * flow is bound to the user who started it. These two pure steps decide what to call and where
 * to send the browser; neither ever puts the code or the state into a URL, a message or a log.
 */
export type CallbackInput =
  | { kind: "exchange"; provider: ProviderKey; code: string; state: string }
  | { kind: "done"; location: string };

const BACK = "/settings/integrations";
const MAX_PARAM = 4096;

export function readCallback(provider: unknown, params: Record<string, string | string[] | undefined>): CallbackInput {
  if (!isConnectable(provider)) return { kind: "done", location: `${BACK}?error=invalid_provider` };
  const providerError = first(params.error);
  if (typeof providerError === "string" && providerError) {
    // Any error from the provider means nothing was granted: no API call, and the user sees the
    // cancelled message. The provider's own wording is never echoed.
    return { kind: "done", location: `${BACK}?error=access_denied` };
  }
  const code = first(params.code);
  const state = first(params.state);
  const valid = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_PARAM;
  if (!valid(code) || !valid(state)) return { kind: "done", location: `${BACK}?error=invalid_state` };
  return { kind: "exchange", provider, code, state };
}

/** Where to go after `POST /oauth/{provider}`: success, or one fixed error key per outcome. */
const CALLBACK_REASONS = new Set([
  "invalid_state",
  "state_expired",
  "exchange_failed",
  "not_configured",
  "pm_already_connected",
  "account_connected_elsewhere",
  "post_install_failed",
]);

export function callbackOutcome(
  provider: ProviderKey,
  result: { ok: true } | { ok: false; status: number; code: string; reason?: string | null },
): string {
  if (result.ok) return `${BACK}?connected=${provider}`;
  // integration-service names the outcome in `reason`; a known one is used as is.
  if (result.reason && CALLBACK_REASONS.has(result.reason)) return `${BACK}?error=${result.reason}`;
  const code = result.code.toUpperCase();
  let key = "exchange_failed";
  if (code === "ACCOUNT_CONNECTED_ELSEWHERE") key = "account_connected_elsewhere";
  else if (code === "PM_ALREADY_CONNECTED") key = "pm_already_connected";
  else if (code === "PROVIDER_NOT_CONFIGURED") key = "not_configured";
  else if (code === "AUTH_REQUIRED" || code === "TOKEN_EXPIRED" || result.status === 401) key = "session_expired";
  else if (result.status === 403) key = "forbidden";
  else if (code.includes("STATE") && (code.includes("EXPIRED") || code.includes("EXPIRY"))) key = "state_expired";
  else if (code.includes("STATE") || code.includes("PKCE")) key = "invalid_state";
  else if (result.status === 400 || result.status === 404 || result.status === 422) key = "invalid_state";
  // A bare 502 without `reason` may be the gateway failing to reach the service, so it does not
  // claim the connection was saved: it stays a generic failure.
  return `${BACK}?error=${key}`;
}

/** The Slack card's line about decision checks; null when the server says nothing about them. */
export function decisionChecksCopy(value: DecisionChecks | null | undefined): { tone: "ok" | "medium"; label: string; text: string } | null {
  if (value === "on") {
    return {
      tone: "ok",
      label: "Decision checks on",
      text: "Decision checks are on in channels Mytheus is in. When a message goes against a decision, only its writer is told first, in the thread.",
    };
  }
  if (value === "needs_reconnect") {
    return {
      tone: "medium",
      label: "Reconnect for decision checks",
      text: "Reconnect Slack to let Mytheus check messages against decisions. The new install asks to read messages in the channels Mytheus is in.",
    };
  }
  return null;
}

/* ------------------------------------------------------------------------------------------------
 * The settings page's view (the redesign of 2026-11-12). Every provider is one card with exactly
 * one status chip and exactly one footer action, so the state below is what a card shows.
 * ---------------------------------------------------------------------------------------------- */

/**
 * - `connected`: active at the provider (account, last sync, Disconnect).
 * - `ready`: the server has app credentials and nothing is connected (Connect).
 * - `needs_setup`: the server has no app credentials for it yet (Set up, for admins).
 * - `error`: connected but failing at the provider (Reconnect).
 * - `blocked`: Jira while another tracker is connected (one tracker per workspace).
 * - `unknown`: the viewer may not read the connections (not an admin).
 */
export type ProviderView = "connected" | "ready" | "needs_setup" | "error" | "blocked" | "unknown";

export function providerView(item: IntegrationItem | undefined, opts: { otherTrackerConnected?: boolean } = {}): ProviderView {
  const state = cardState(item);
  if (state.kind === "connected") return state.status === "active" ? "connected" : "error";
  if (state.kind === "not_configured") return "needs_setup";
  return opts.otherTrackerConnected ? "blocked" : "ready";
}

/** The one chip each state carries. */
export const VIEW_CHIP: Record<ProviderView, { label: string; tone: "ok" | "neutral" | "outline" | "high" | "medium" }> = {
  connected: { label: "Connected", tone: "ok" },
  ready: { label: "Ready to connect", tone: "neutral" },
  needs_setup: { label: "Needs setup", tone: "outline" },
  error: { label: "Error", tone: "medium" },
  blocked: { label: "Tracker in use", tone: "medium" },
  unknown: { label: "Managed by admins", tone: "outline" },
};

/**
 * The OAuth redirect URI integration-service sends to every provider (`config.redirect_uri` in
 * mytheus-backend): the web app's own callback page. `appOrigin` is the origin this page was
 * served from, which in production is the app host (`https://dashboard.mytheus.cloud`), the same
 * value the server's `APP_BASE_URL` must hold.
 */
export const DEFAULT_APP_ORIGIN = "https://dashboard.mytheus.cloud";

export function appOriginFrom(host: string | null | undefined, proto: string | null | undefined): string {
  const h = (host ?? "").split(",")[0].trim().toLowerCase();
  // A host header is only trusted as an origin when it looks like one (no path, no spaces).
  if (!h || !/^[a-z0-9.-]+(:\d{1,5})?$/.test(h)) return DEFAULT_APP_ORIGIN;
  const p = (proto ?? "").split(",")[0].trim().toLowerCase();
  const scheme = p === "http" || p === "https" ? p : h.startsWith("localhost") || h.startsWith("127.0.0.1") ? "http" : "https";
  return `${scheme}://${h}`;
}

export function callbackUrl(appOrigin: string, provider: ProviderKey): string {
  return `${appOrigin.replace(/\/+$/, "")}/settings/integrations/callback/${provider}`;
}

/** What an admin needs to create the provider's app and hand its credentials to the server. */
export interface SetupGuide {
  provider: ProviderKey;
  /** What the integration does, one or two sentences. */
  does: string;
  /** Where the app is created. */
  console: { label: string; href: string };
  /** Short, ordered steps at the provider, in plain words. */
  steps: string[];
  /** The OAuth scopes integration-service requests (`clients.py` in mytheus-backend). */
  scopes: string[];
  /** Said instead of a scope list when the provider has none. */
  scopesNote?: string;
  /** Other URLs to paste at the provider, on the API origin. */
  apiUrls?: { label: string; path: string }[];
  /** The env var names the server reads; values are never shown here. */
  env: string[];
}

export const PUSH_COMMAND = "scripts/push-secrets.sh integrations";

export const SETUP_GUIDES: Record<Exclude<ProviderKey, "linear">, SetupGuide> = {
  google_calendar: {
    provider: "google_calendar",
    does: "Meetings on the installer's calendar sync in, with attendees matched to people here, so each Myte can prepare before you join.",
    console: { label: "Google Cloud Console credentials", href: "https://console.cloud.google.com/apis/credentials" },
    steps: [
      "Enable the Google Calendar API and the Google Drive API for the project.",
      "Create an OAuth client ID of type Web application.",
      "Add the redirect URL below as an authorized redirect URI.",
    ],
    scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/drive.readonly"],
    env: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
  },
  slack: {
    provider: "slack",
    does: "Prep briefs, summaries and action reminders arrive as direct messages, and messages that go against a decision are flagged to their writer.",
    console: { label: "Slack apps", href: "https://api.slack.com/apps" },
    steps: [
      "Create a new app from scratch in your workspace.",
      "Under OAuth and Permissions, add the redirect URL below and the bot token scopes.",
      "Turn on Event Subscriptions and Interactivity with the URLs below; subscribe to the bot events message.channels, message.groups, message.im and message.mpim.",
      "Add a message shortcut named Check against decisions with the callback ID check_against_decisions.",
    ],
    scopes: [
      "chat:write",
      "users:read",
      "users:read.email",
      "im:write",
      "channels:history",
      "groups:history",
      "channels:read",
      "groups:read",
      "commands",
      "im:history",
      "mpim:history",
    ],
    apiUrls: [
      { label: "Event Subscriptions request URL", path: "/webhooks/slack" },
      { label: "Interactivity request URL", path: "/webhooks/slack/interactions" },
    ],
    env: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", "SLACK_SIGNING_SECRET"],
  },
  jira: {
    provider: "jira",
    does: "Confirmed action items become Jira issues with a link back to the meeting, and closing an issue marks the action done here.",
    console: { label: "Atlassian developer console", href: "https://developer.atlassian.com/console/myapps/" },
    steps: [
      "Create an OAuth 2.0 integration.",
      "Under Permissions, add the Jira API and the scopes below.",
      "Under Authorization, set the callback URL to the redirect URL below.",
    ],
    scopes: ["read:jira-work", "write:jira-work", "read:jira-user", "manage:jira-webhook", "offline_access"],
    env: ["JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET"],
  },
  hubspot: {
    provider: "hubspot",
    does: "When a meeting with people outside the workspace ends, its confirmed decisions and actions become one note on the matching companies and contacts.",
    console: { label: "HubSpot developer apps", href: "https://app.hubspot.com/developer" },
    steps: ["Create a public app in your developer account.", "Under Auth, add the redirect URL below and the scopes below."],
    scopes: [
      "oauth",
      "crm.objects.companies.read",
      "crm.objects.companies.write",
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.deals.read",
    ],
    env: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
  },
  notion: {
    provider: "notion",
    does: "Export a decision record, with what it follows from and what replaced it, as a page under any Notion page you share with Mytheus.",
    console: { label: "Notion integrations", href: "https://www.notion.so/my-integrations" },
    steps: [
      "Create a new integration and make it public.",
      "Give it the Read content, Update content and Insert content capabilities.",
      "Add the redirect URL below as a redirect URI.",
    ],
    scopes: [],
    scopesNote: "Notion has no OAuth scopes. Access is granted per page when someone connects.",
    env: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
  },
  confluence: {
    provider: "confluence",
    does: "Export a decision record, with its lineage, as a page in a Confluence space of your choice.",
    console: { label: "Atlassian developer console", href: "https://developer.atlassian.com/console/myapps/" },
    steps: [
      "Create an OAuth 2.0 integration of its own (its callback URL differs from Jira's).",
      "Under Permissions, add the Confluence API and the scopes below.",
      "Under Authorization, add the redirect URL below as a callback URL.",
    ],
    scopes: ["read:confluence-space.summary", "read:confluence-content.summary", "write:confluence-content", "offline_access"],
    env: ["CONFLUENCE_CLIENT_ID", "CONFLUENCE_CLIENT_SECRET"],
  },
};
