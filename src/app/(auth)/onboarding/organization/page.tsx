import type { Metadata } from "next";
import { ChooseOrganization } from "@/components/auth/ChooseOrganization";

export const metadata: Metadata = { title: "Set up your workspace · Mytheus" };

/** Clerk's `choose-organization` session task, mapped here by `taskUrls` in the root layout. */
export default function Page() {
  return <ChooseOrganization />;
}
