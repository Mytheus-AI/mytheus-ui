import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Terms — Reprise" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Legal"
      title="Terms of service."
      blurb="Our terms of service are being finalized and will be published here before Reprise opens to the public."
    />
  );
}
