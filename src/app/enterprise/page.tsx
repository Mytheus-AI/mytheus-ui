import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Enterprise — Reprise" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Enterprise"
      title="Built for whole organizations."
      blurb="Details on org-wide deployment, security, and admin controls are on the way. Reach out and we'll keep you posted."
    />
  );
}
