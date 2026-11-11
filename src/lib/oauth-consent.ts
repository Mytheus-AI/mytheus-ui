/**
 * Connecting an app such as Claude to Mytheus over OAuth, as pure functions: the consent page's
 * states and words, the safe return check, and the Connected apps view model.
 *
 * The flow (identity-tenant-service is the authorization server): Claude sends the browser to
 * `GET /oauth/authorize`, which validates the request and redirects here, to `/oauth/consent`,
 * with either a signed `request` or an `error`. The page reads `GET /api/v1/oauth/consent` and
 * the person approves or denies (`POST /api/v1/oauth/consent`), which answers with the app's own
 * callback URL to send the browser back to. Pure so it can be tested without a server.
 */

export type OAuthScope = "read" | "read_write";

/** What the consent page renders instead of the approve card. */
export type ConsentProblem =
  | "missing_request"
  | "invalid_request"
  | "expired_request"
  | "unknown_client"
  | "invalid_redirect"
  | "no_account"
  | "unavailable";

export const CONSENT_PROBLEM: Record<ConsentProblem, { title: string; text: string; retry: boolean }> = {
  missing_request: {
    title: "There is nothing to approve here",
    text: "This page opens when an app such as Claude asks to connect to Mytheus. Start connecting from the app, and it will bring you back here.",
    retry: false,
  },
  invalid_request: {
    title: "This sign-in link is not valid",
    text: "The link was changed or cut short on its way here. Go back to the app and connect again.",
    retry: false,
  },
  expired_request: {
    title: "This sign-in request has expired",
    text: "A request lasts 15 minutes. Go back to the app and connect again; nothing was shared.",
    retry: false,
  },
  unknown_client: {
    title: "This app is not registered with Mytheus",
    text: "Remove the connector in the app and add it again, then connect. Nothing was shared.",
    retry: false,
  },
  invalid_redirect: {
    title: "This app's return address does not match",
    text: "For your safety Mytheus did not send you anywhere. Remove the connector in the app and add it again.",
    retry: false,
  },
  no_account: {
    title: "Your account is not set up in this workspace yet",
    text: "Ask an admin of the workspace to add you, or switch to a workspace you belong to, then connect again from the app.",
    retry: false,
  },
  unavailable: {
    title: "Mytheus could not load this request",
    text: "Nothing was shared. This is usually a passing problem; try again in a moment.",
    retry: true,
  },
};

/** The `error` that `GET /oauth/authorize` puts on the consent URL when it cannot trust the
 *  request enough to send the browser back to the app. */
export function problemFromAuthorizeError(error: string | null | undefined): ConsentProblem | null {
  if (!error) return null;
  if (error === "invalid_client") return "unknown_client";
  if (error === "invalid_redirect_uri") return "invalid_redirect";
  return "invalid_request";
}

/** The consent read's failure, from its RFC 7807 status and `reason`. */
export function problemFromApi(status: number, reason: string | null | undefined): ConsentProblem {
  if (reason === "expired_request") return "expired_request";
  if (reason === "invalid_request") return "invalid_request";
  if (reason === "unknown_client" || status === 404) return "unknown_client";
  if (status === 403) return "no_account";
  if (status === 400 || status === 422) return "invalid_request";
  return "unavailable";
}

export const CONSENT_SCOPE: Record<OAuthScope, { label: string; help: string; can: string[] }> = {
  read_write: {
    label: "Read and act",
    help: "Search and ask across your meetings, read decisions and tasks, and create tasks as you.",
    can: ["Search and ask across meetings you took part in", "Read decisions, actions, promises and meeting outcomes", "Create tasks as you, when you ask it to"],
  },
  read: {
    label: "Read only",
    help: "Search and ask, and read meetings, decisions and your tasks. It cannot change anything.",
    can: ["Search and ask across meetings you took part in", "Read decisions, actions, promises and meeting outcomes"],
  },
};

/** What an approved app can never do, whatever it asked for. */
export const CONSENT_NEVER: readonly string[] = [
  "See meetings you were not part of",
  "Manage your tokens, settings, members or billing",
  "Keep access after you disconnect it in Settings, API access",
];

/** The access a person may choose: an app asking for `read_write` can be narrowed to `read`,
 *  never the reverse. */
export function scopeChoices(requested: OAuthScope): OAuthScope[] {
  return requested === "read_write" ? ["read_write", "read"] : ["read"];
}

/** The URL the consent decision returned, if it is safe to send the browser to: an absolute
 *  https URL, or http on a loopback host (a desktop or command-line app on this computer). */
export function safeReturnUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return url.toString();
    const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    return url.protocol === "http:" && loopback ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The consent page's own address, to come back to after signing in. */
export function consentPath(request: string): string {
  return `/oauth/consent?request=${encodeURIComponent(request)}`;
}

/** One connected app as Settings lists it (identity's `ConnectedApp`, kept structural). */
export interface ConnectedAppRow {
  id: string;
  client_id: string;
  client_name: string;
  redirect_host: string;
  verified_redirect: boolean;
  scope: OAuthScope;
  connected_at: string;
  last_refreshed_at?: string | null;
  last_used_at?: string | null;
}

/** Newest connection first. */
export function sortConnectedApps<T extends ConnectedAppRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => Date.parse(b.connected_at) - Date.parse(a.connected_at));
}

/** The most recent sign of life: a request through the gateway, else the last token refresh. */
export function lastActivity(row: ConnectedAppRow): string | null {
  const used = row.last_used_at ? Date.parse(row.last_used_at) : NaN;
  const refreshed = row.last_refreshed_at ? Date.parse(row.last_refreshed_at) : NaN;
  if (Number.isNaN(used) && Number.isNaN(refreshed)) return null;
  if (Number.isNaN(used)) return row.last_refreshed_at ?? null;
  if (Number.isNaN(refreshed)) return row.last_used_at ?? null;
  return used >= refreshed ? (row.last_used_at ?? null) : (row.last_refreshed_at ?? null);
}

/** The steps to add Mytheus to Claude as a custom connector (claude.ai and Claude Desktop). */
export function claudeConnectorSteps(mcpUrl: string): string[] {
  return [
    "In Claude, open Settings, then Connectors, and choose Add custom connector.",
    `Name it Mytheus and paste ${mcpUrl} as the server URL. Leave the OAuth client ID and secret empty.`,
    "Choose Add, then Connect. Claude opens Mytheus: sign in if asked, check the access, and approve.",
  ];
}
