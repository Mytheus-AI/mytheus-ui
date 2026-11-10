import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Page, PageHead } from "@/components/ui/Page";
import { Note } from "@/components/ui/Note";
import { resolveOrgContext } from "@/lib/api/org-context";
import { legacyHref, type SearchParams } from "@/lib/legacy-routes";

export const metadata: Metadata = { title: "Billing | Mytheus" };

/** Billing moved into the Workspace console (Usage and billing), which is for admins. An admin's
    old link lands there; a member, who has no Workspace console, gets a plain note rather than a
    404. */
export default async function LegacyBilling({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await resolveOrgContext();
  if (ctx?.user.role === "admin") redirect(legacyHref("/billing", searchParams) ?? "/workspace/billing");
  return (
    <Page width="read">
      <PageHead title="Billing" context="The plan and its usage are looked after by your workspace admins." />
      <Note>Only workspace owners and admins can see the plan and billing. Ask one of them if you need something changed.</Note>
    </Page>
  );
}
