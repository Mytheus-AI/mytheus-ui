import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Blog — Reprise" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Writing"
      title="The blog is warming up."
      blurb="We're getting our first pieces ready — notes on meetings, memory, and building agents that actually help. Back soon."
    />
  );
}
