import type { Metadata } from "next";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { resolveOrgContext } from "@/lib/api/org-context";
import { loadIntegrations } from "@/lib/api/integrations";
import { listMembers } from "@/lib/api/members";
import { parseReturnState } from "@/lib/integrations";

export const metadata: Metadata = { title: "Integrations | Mytheus" };
export const dynamic = "force-dynamic";

/* Owner and admin only (P12 contract section 3). The check here only decides what the page
   offers; integration-service enforces the tier on every call. */
export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await resolveOrgContext();
  const isAdmin = ctx?.user.role === "admin";
  const banner = parseReturnState(searchParams);

  if (!isAdmin) {
    return (
      <>
        <SectionBar title="Integrations" context="Calendar, Slack, one project tracker, and the tools decision records and meeting notes can go to." />
        <Note>
          Only workspace owners and admins can connect integrations. Ask an admin to connect one; exporting a decision to Notion, Confluence or Slack works for
          everyone once it is connected.
        </Note>
      </>
    );
  }

  const [load, members] = await Promise.all([loadIntegrations(), listMembers()]);
  const people = new Map((members ?? []).map((m) => [m.id, m.isYou ? `${m.name} (you)` : m.name]));

  return (
    <>
      <SectionBar
        title="Integrations"
        context="Calendar, Slack and one project tracker for agents, plus HubSpot, Notion and Confluence for sharing what the workspace confirms."
      />
      <div className="grid gap-5">
        <IntegrationsPanel load={load} banner={banner} people={people} />
      </div>
    </>
  );
}
