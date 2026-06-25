import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Security — Reprise" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Legal"
      title="Security."
      blurb="A full write-up of how Reprise protects your meetings and data is on the way. Security is foundational, not an afterthought."
    />
  );
}
