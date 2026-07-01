import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Get started — Mytheus" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Get started"
      title="Your agent is almost ready."
      blurb="Sign-up is coming online shortly. Mytheus is in active development — check back soon to claim your workspace."
    />
  );
}
