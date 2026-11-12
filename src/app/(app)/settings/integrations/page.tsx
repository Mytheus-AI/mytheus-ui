import type { Metadata } from "next";
import { headers } from "next/headers";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { SectionBar } from "@/components/ui/Page";
import { apiOrigin } from "@/lib/api-access";
import { resolveOrgContext } from "@/lib/api/org-context";
import { loadIntegrations } from "@/lib/api/integrations";
import { listMembers } from "@/lib/api/members";
import { appOriginFrom, parseReturnState } from "@/lib/integrations";

export const metadata: Metadata = { title: "Integrations | Mytheus" };
export const dynamic = "force-dynamic";

/* Every member sees the same cards; only owners and admins can connect, disconnect or set one up.
   The check here only decides what the page offers; integration-service enforces the tier on every
   call (its list is admin-only, so a member's page does not ask for it). */
export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await resolveOrgContext();
  const isAdmin = ctx?.user.role === "admin";
  const banner = parseReturnState(searchParams);
  const h = headers();
  // The OAuth redirect URL shown in "Set up" is this app's own callback page, on the host this
  // page was served from (the server's APP_BASE_URL must name the same origin).
  const appOrigin = appOriginFrom(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
  const api = apiOrigin(process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? process.env.API_GATEWAY_URL);

  const [load, members] = isAdmin ? await Promise.all([loadIntegrations(), listMembers()]) : [{ kind: "forbidden" as const }, null];
  const people = new Map((members ?? []).map((m) => [m.id, m.isYou ? `${m.name} (you)` : m.name]));

  return (
    <>
      <SectionBar title="Integrations" context="The tools your Mytes work with, and where the workspace shares what it confirms." />
      <div className="grid gap-6">
        <IntegrationsPanel load={load} banner={banner} people={people} canManage={isAdmin} appOrigin={appOrigin} apiOrigin={api} />
      </div>
    </>
  );
}
