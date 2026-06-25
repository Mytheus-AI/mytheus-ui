import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Verify — Student Program — Reprise" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Students"
      title="Verification is coming soon."
      blurb="Student verification isn't live yet. Once the program opens, you'll confirm your status right here."
    />
  );
}
