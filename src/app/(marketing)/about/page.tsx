import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { AboutHero } from "@/components/marketing/about/AboutHero";
import { AboutCrew } from "@/components/marketing/about/AboutCrew";
import { AboutCraft } from "@/components/marketing/about/AboutCraft";
import { AboutManifesto } from "@/components/marketing/about/AboutManifesto";

export const metadata: Metadata = {
  title: "About — Mytheus",
  description:
    "Meet CyberSprinters — Sushan Shetty, Samar Rihan, Shaun Marvell Rodrigues, and Yash V Maurya — the four builders of agentic software behind Mytheus.",
};

/* The team page as a four-movement film: the cinematic opener, the crew
   (photo + four interactive member panels), what we build (flagship +
   disciplines), and the sprint manifesto that closes into the footer. */
export default function Page() {
  return (
    <PageShell>
      <AboutHero />
      <AboutCrew />
      <AboutCraft />
      <AboutManifesto />
    </PageShell>
  );
}
