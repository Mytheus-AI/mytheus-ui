import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { AboutTeam } from "@/components/marketing/AboutTeam";

export const metadata: Metadata = {
  title: "About — Mytheus",
  description:
    "Meet CyberSprinters — Sushan Shetty, Samar Rihan, Shaun Marvell Rodrigues, and Yash V Maurya — the four builders behind Mytheus.",
};

export default function Page() {
  return (
    <PageShell>
      <AboutTeam />
    </PageShell>
  );
}
