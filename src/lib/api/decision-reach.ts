/**
 * Reads for sharing a decision record (Phase 4 reach). SERVER-ONLY, inherited from
 * `lib/api/client.ts`.
 *
 *   GET /integrations/exports/destinations?provider=notion|confluence|slack   (integration-service)
 *   GET /integrations/exports/decisions/{id}         where this decision has been exported
 *   GET /api/v1/decisions/{id}/share-links           (core-api) the record's share links
 *
 * Each read degrades on its own: one tool being unreachable switches off only its own export.
 */

import { ApiError, api, apiSafe } from "@/lib/api/client";
import type { components as CoreSchemas } from "@/lib/api/generated/core-api";
import type { components as IntegrationSchemas } from "@/lib/api/generated/integration-service";
import type { DestinationsLoad, ExportProvider } from "@/lib/decision-reach";

export type ShareLink = CoreSchemas["schemas"]["ShareLink"];
type ShareLinkList = CoreSchemas["schemas"]["ShareLinkList"];
type ExportDestinations = IntegrationSchemas["schemas"]["ExportDestinations"];
type DecisionExportList = IntegrationSchemas["schemas"]["DecisionExportList"];
export type DecisionExportSummary = IntegrationSchemas["schemas"]["DecisionExportSummary"];
export type DecisionExport = IntegrationSchemas["schemas"]["DecisionExport"];
export type DecisionExportRequest = IntegrationSchemas["schemas"]["DecisionExportRequest"];

export type DecisionReach = {
  destinations: Record<ExportProvider, DestinationsLoad>;
  exports: DecisionExportSummary[];
  /** null when the links could not be read; `shareable: false` when the caller may not share */
  links: ShareLink[] | null;
  shareable: boolean;
};

async function destinations(provider: ExportProvider): Promise<DestinationsLoad> {
  const res = await apiSafe<ExportDestinations>("/integrations/exports/destinations", { query: { provider } });
  if (!res.ok) return { kind: "unavailable" };
  const d = res.data;
  return {
    kind: "live",
    configured: d.configured,
    connected: d.connected,
    destinations: d.destinations.map((x) => ({ id: x.id, name: x.name, kind: x.kind, url: x.url ?? null })),
    note: d.note ?? null,
  };
}

export async function loadDecisionReach(decisionId: string): Promise<DecisionReach> {
  const id = encodeURIComponent(decisionId);
  const [notion, confluence, slack, exports, links] = await Promise.all([
    destinations("notion"),
    destinations("confluence"),
    destinations("slack"),
    apiSafe<DecisionExportList>(`/integrations/exports/decisions/${id}`),
    apiSafe<ShareLinkList>(`/api/v1/decisions/${id}/share-links`),
  ]);
  // A 403 on the share links is the meeting saying this person may not share from it.
  const forbidden = !links.ok && links.error.status === 403;
  return {
    destinations: { notion, confluence, slack },
    exports: exports.ok ? exports.data.items : [],
    links: links.ok ? links.data.items : forbidden ? [] : null,
    shareable: !forbidden,
  };
}

export async function postDecisionExport(decisionId: string, body: DecisionExportRequest): Promise<DecisionExport> {
  return api<DecisionExport>(`/integrations/exports/decisions/${encodeURIComponent(decisionId)}`, { method: "POST", body });
}

export async function postDecisionShareLink(decisionId: string): Promise<ShareLink> {
  return api<ShareLink>(`/api/v1/decisions/${encodeURIComponent(decisionId)}/share-links`, { method: "POST", body: {} });
}

export async function deleteShareLink(linkId: string): Promise<void> {
  await api<void>(`/api/v1/share-links/${encodeURIComponent(linkId)}`, { method: "DELETE" });
}

export { ApiError };
