import { normalizeIntegrations, type IntegrationItem, type ProviderKey } from "../../src/lib/integrations";

/* Settings > Integrations, as integration-service's `GET /integrations` would answer. */

const row = (provider: string, over: Partial<IntegrationItem> = {}): IntegrationItem => ({
  provider,
  configured: true,
  status: null,
  scopes: [],
  external_account_id: null,
  installed_by: null,
  installed_at: null,
  last_synced_at: null,
  ...over,
});

const ALL = ["google_calendar", "slack", "jira", "linear", "hubspot", "notion", "confluence"];

/** The owner's server today: no provider has app credentials. */
export const NOTHING_CONFIGURED: Map<ProviderKey, IntegrationItem> = normalizeIntegrations(ALL.map((p) => row(p, { configured: false })));

/** Every state at once: connected, error, ready, needs setup. */
export const MIXED: Map<ProviderKey, IntegrationItem> = normalizeIntegrations([
  row("google_calendar", {
    status: "active",
    external_account_id: "maya@acme.com",
    installed_by: "u-maya",
    installed_at: "2026-10-02T10:00:00Z",
    last_synced_at: "2026-11-12T08:41:00Z",
    scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"],
  }),
  row("slack", {
    status: "degraded",
    external_account_id: "T04ACME",
    installed_by: "u-raj",
    installed_at: "2026-09-14T10:00:00Z",
    last_synced_at: "2026-11-10T16:20:00Z",
    decision_checks: "on",
  }),
  row("jira"),
  row("linear", { configured: false }),
  row("hubspot", { configured: false }),
  row("notion"),
  row("confluence", { configured: false }),
]);

/** Linear connected (not built, but the canon enum allows it): Jira is blocked. */
export const OTHER_TRACKER: Map<ProviderKey, IntegrationItem> = normalizeIntegrations([
  row("google_calendar"),
  row("slack"),
  row("jira"),
  row("linear", { status: "active" }),
  row("hubspot"),
  row("notion"),
  row("confluence"),
]);

export const PEOPLE = new Map([
  ["u-maya", "Maya Chen (you)"],
  ["u-raj", "Raj Patel"],
]);
