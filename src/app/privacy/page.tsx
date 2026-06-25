import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Privacy — Reprise" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Legal"
      title="Privacy policy."
      blurb="Our full privacy policy is being finalized. Until then, the short version: your notes are yours, private by default."
    />
  );
}
