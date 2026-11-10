import { Bell, Handshake, UserCircle } from "@phosphor-icons/react/ssr";
import { SectionCard } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { InfoRow, InlineRow } from "@/components/ui/Form";
import { TextLink } from "@/components/ui/TextLink";
import { loadIntegrations } from "@/lib/api/integrations";
import { resolveOrgContext } from "@/lib/api/org-context";
import { cardState } from "@/lib/integrations";

/* Promise nudges (only-Mytheus wave, contract section 4): when a task you promised by a date is
   linked to a Jira issue that is still open after that date, your agent tells you first, privately;
   two days later, if it is still open, the meeting's host hears about it. Nothing to switch: this
   card explains the rule and says whether Jira is connected, because without it nothing runs.
   Integrations are an admin read; for everyone else the card says who connects Jira. */

type JiraState = "connected" | "not_connected" | "unknown" | "admin_only";

async function jiraState(): Promise<{ state: JiraState; isAdmin: boolean }> {
  const ctx = await resolveOrgContext();
  const isAdmin = ctx?.user.role === "admin";
  if (!isAdmin) return { state: "admin_only", isAdmin };
  const load = await loadIntegrations();
  if (load.kind === "forbidden") return { state: "admin_only", isAdmin };
  if (load.kind === "unavailable") return { state: "unknown", isAdmin };
  return { state: cardState(load.items.get("jira")).kind === "connected" ? "connected" : "not_connected", isAdmin };
}

export async function PromiseNudgesCard() {
  const { state, isAdmin } = await jiraState();
  return (
    <SectionCard
      title="Promise nudges"
      headingId="promise-nudges-h"
      headingLevel={3}
      description="When a task you promised by a date is still open in Jira after it, your agent nudges you before anyone else hears."
    >
      <div className="grid md:grid-cols-2 md:divide-x md:divide-line">
        <InfoRow icon={<Bell size={18} />} title="You first, privately">
          The day after the due date, if the linked Jira ticket is still open, only you get a note in your Inbox.
        </InfoRow>
        <InfoRow icon={<UserCircle size={18} />} title="The host, two days later">
          If the ticket is still open two days after that, the host of the meeting where you made the promise is told.
        </InfoRow>
      </div>
      <InlineRow
        label="Jira"
        help={
          state === "connected"
            ? "Connected. Nudges check your promised tasks every morning."
            : state === "not_connected"
              ? "Not connected, so no nudges are sent. Connect Jira and they start the next morning."
              : state === "unknown"
                ? "We couldn't check the Jira connection just now. Nudges run only while it is connected."
                : "Nudges run only while your workspace has Jira connected. A workspace admin connects it."
        }
      >
        {state === "connected" ? (
          <Chip tone="ok" icon={<Handshake size={14} weight="fill" />}>
            Connected
          </Chip>
        ) : state === "not_connected" && isAdmin ? (
          <TextLink href="/settings/integrations">Connect Jira</TextLink>
        ) : state === "not_connected" ? (
          <Chip tone="outline">Not connected</Chip>
        ) : (
          <TextLink href="/settings/integrations">See integrations</TextLink>
        )}
      </InlineRow>
    </SectionCard>
  );
}
