import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Careers — Reprise" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Join us"
      title="We're putting the team together."
      blurb="Open roles will land here soon. If building agentic meeting software sounds like your thing, keep an eye on this page."
    />
  );
}
