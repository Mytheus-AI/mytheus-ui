/**
 * Sharing a decision record, as pure functions: whether each export destination can be used
 * (ADR-0037 D3: an export to a tool that is not configured or not connected is shown, switched
 * off, with the reason), the Slack channel rule, and the share-link view.
 *
 * Exports go through integration-service (`/integrations/exports/*`), share links through
 * core-api (`/api/v1/decisions/{id}/share-links`). Both build the record the same way, as the
 * person sees it: confirmed facts only, with its lineage (what it follows from and what replaced
 * it). Pure so the rules can be tested without a server.
 */

export type ExportProvider = "notion" | "confluence" | "slack";
export const EXPORT_PROVIDERS: readonly ExportProvider[] = ["notion", "confluence", "slack"];

export const EXPORT_NAME: Record<ExportProvider, string> = {
  notion: "Notion",
  confluence: "Confluence",
  slack: "Slack",
};

export interface ExportDestinationView {
  id: string;
  name: string;
  kind: "page" | "space" | "dm";
  url?: string | null;
}

/** What `GET /integrations/exports/destinations?provider=` said, or that it could not be read. */
export type DestinationsLoad =
  | { kind: "live"; configured: boolean; connected: boolean; destinations: ExportDestinationView[]; note: string | null }
  | { kind: "unavailable" };

export type ExportAvailability =
  | { enabled: true }
  | { enabled: false; reason: "not_configured" | "not_connected" | "unavailable" | "no_destinations"; message: string };

/** Whether Export to {provider} can be pressed, and if not, the sentence that says why. */
export function exportAvailability(provider: ExportProvider, load: DestinationsLoad, isAdmin: boolean): ExportAvailability {
  const name = EXPORT_NAME[provider];
  if (load.kind === "unavailable") {
    return { enabled: false, reason: "unavailable", message: `${name} could not be reached just now. Try again in a moment.` };
  }
  if (!load.configured) {
    return { enabled: false, reason: "not_configured", message: `${name} is not available on this Mytheus server yet.` };
  }
  if (!load.connected) {
    return {
      enabled: false,
      reason: "not_connected",
      message: isAdmin
        ? `${name} is not connected to the workspace. Connect it in Settings, Integrations.`
        : `${name} is not connected to the workspace. A workspace admin can connect it.`,
    };
  }
  if (provider !== "slack" && load.destinations.length === 0) {
    return {
      enabled: false,
      reason: "no_destinations",
      message:
        provider === "notion"
          ? "No Notion page is shared with Mytheus yet. In Notion, open a page, choose Connections, and add Mytheus."
          : "No Confluence space is visible to Mytheus yet.",
    };
  }
  return { enabled: true };
}

/** A Slack channel id as the export accepts it (starts with C or G), or null for a direct
 *  message. Anything else is an error message. */
export function slackChannel(raw: string): { ok: true; channel: string | null } | { ok: false; message: string } {
  const value = raw.trim().toUpperCase();
  if (!value) return { ok: true, channel: null };
  if (/^[CG][A-Z0-9]{2,30}$/.test(value)) return { ok: true, channel: value };
  return { ok: false, message: "Use the channel id, which starts with C (in Slack: channel details, at the bottom)." };
}

/** Copy for an export the server refused, keyed by its `reason`. */
export function exportErrorMessage(provider: ExportProvider, status: number, reason: string | null): string {
  const name = EXPORT_NAME[provider];
  if (reason === "not_configured") return `${name} is not available on this Mytheus server yet.`;
  if (reason === "not_connected") return `${name} is not connected to the workspace any more. A workspace admin can connect it again.`;
  if (reason === "slack_not_in_channel") return "Invite the Mytheus app to that channel first, then export again.";
  if (reason === "slack_user_not_found") return "Slack has no account with your email address, so a direct message cannot reach you. Pick a channel instead.";
  if (reason?.startsWith("slack_")) return "Slack refused the message. Check the channel and try again.";
  if (status === 404) return "This decision cannot be shared by you. Only people who were in the meeting can share it.";
  if (status === 502 || reason === "export_failed") return `${name} did not accept the export. Try again in a moment.`;
  return `The decision could not be exported to ${name}. Try again.`;
}

/** Copy for a share link the server refused. */
export function shareErrorMessage(status: number, reason: string | null): string {
  if (reason === "confidential_host_only") return "This meeting is confidential, so only its host can share its decisions.";
  if (reason === "not_configured") return "Share links are not available on this Mytheus server yet.";
  if (status === 403) return "Only people who were in the meeting can share its decisions.";
  if (status === 404) return "This decision cannot be shared. It may have been removed.";
  return "The share link could not be created. Try again.";
}

export interface ShareLinkView {
  id: string;
  url: string;
  state: "active" | "expired" | "revoked";
  created_by_name?: string | null;
  created_at: string;
  expires_at: string;
  view_count: number;
  can_revoke: boolean;
}

/** The link Copy share link should reuse: the newest active one you may revoke (your own), so
 *  pressing Copy twice does not mint two links. */
export function reusableLink<T extends ShareLinkView>(links: readonly T[]): T | null {
  return (
    [...links]
      .filter((l) => l.state === "active" && l.can_revoke)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null
  );
}
