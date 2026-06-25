import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Student Program — Reprise" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Students"
      title="The student program is coming."
      blurb="Free Reprise for verified students is in the works. Check back soon to get set up."
    />
  );
}
