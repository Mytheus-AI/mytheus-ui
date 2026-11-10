import type { Metadata } from "next";
import { AboutHero } from "@/components/marketing/about/AboutHero";
import { AboutCrew } from "@/components/marketing/about/AboutCrew";
import { AboutCraft } from "@/components/marketing/about/AboutCraft";
import { AboutManifesto } from "@/components/marketing/about/AboutManifesto";
import { CloseCTA } from "@/components/site/CloseCTA";

export const metadata: Metadata = {
  title: "About | Mytheus",
  description:
    "Meet CyberSprinters: Sushan Shetty, Samar Rihan, Shaun Marvell Rodrigues, and Yash V Maurya, the four builders of agentic software behind Mytheus.",
};

/* The team page: the story, the four of us, what we build, how we sprint,
   and the closing panel. */
export default function Page() {
  return (
    <>
      <AboutHero />
      <AboutCrew />
      <AboutCraft />
      <AboutManifesto />
      <CloseCTA
        title="Built in sprints. Remembered forever."
        lead="Every sprint ships; every meeting is remembered. See what the four of us built."
        ctaHref="/"
        ctaLabel="Explore Mytheus"
        secondaryHref="/careers"
        secondaryLabel="Join the sprint"
        note={null}
      />
    </>
  );
}
