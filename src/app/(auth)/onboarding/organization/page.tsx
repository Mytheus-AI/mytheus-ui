import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChooseOrganization } from "@/components/auth/ChooseOrganization";
import { checkOpsGate } from "@/lib/api/admin-ops";

export const metadata: Metadata = { title: "Set up your workspace · Mytheus" };
export const dynamic = "force-dynamic";

/** Clerk's `choose-organization` session task, mapped here by `taskUrls` in the root layout.

    A Mytheus staff account belongs to no workspace, so it stops here for good (ADR-0046 D1).
    Once it is on the staff list, this page sends it to the superadmin console instead; a
    refresh is all it takes. Everyone else picks or creates an organization as before. */
export default async function Page() {
  if ((await checkOpsGate()) === "staff") redirect("/ops");
  return <ChooseOrganization />;
}
