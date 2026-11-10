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

export type ProviderKey = "google_calendar" | "slack" | "jira" | "linear";
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
}

export const PROVIDERS: readonly ProviderKey[] = ["google_calendar", "slack", "jira", "linear"];
export const CONNECTABLE: readonly ProviderKey[] = ["google_calendar", "slack", "jira"];

export const PROVIDER_NAME: Record<ProviderKey, string> = {
  google_calendar: "Google Calendar",
  slack: "Slack",
  jira: "Jira",
  linear: "Linear",
};

export function isProvider(v: unknown): v is ProviderKey {
  return typeof v === "string" && (PROVIDERS as readonly string[]).includes(v);
}

/** Only these three can ever be connected; Linear is not built (R8, contract section 0). */
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
    "https://www.googleapis.com/auth/calendar.readonly": "Read calendars",
    "https://www.googleapis.com/auth/calendar.events.readonly": "Read events",
    "read:jira-work": "Read issues",
    "write:jira-work": "Create and update issues",
    "manage:jira-webhook": "Manage webhooks",
    "read:jira-user": "See people",
    offline_access: "Stay connected",
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
    // Only the provider's own denial is distinguished; anything else is a failed exchange.
    const key = providerError.trim().toLowerCase() === "access_denied" ? "access_denied" : "exchange_failed";
    return { kind: "done", location: `${BACK}?error=${key}` };
  }
  const code = first(params.code);
  const state = first(params.state);
  const valid = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_PARAM;
  if (!valid(code) || !valid(state)) return { kind: "done", location: `${BACK}?error=invalid_state` };
  return { kind: "exchange", provider, code, state };
}

/** Where to go after `POST /oauth/{provider}`: success, or one fixed error key per outcome. */
export function callbackOutcome(
  provider: ProviderKey,
  result: { ok: true } | { ok: false; status: number; code: string },
): string {
  if (result.ok) return `${BACK}?connected=${provider}`;
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
  return `${BACK}?error=${key}`;
}
