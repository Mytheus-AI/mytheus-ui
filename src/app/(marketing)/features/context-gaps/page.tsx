import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/FeaturePage";

export const metadata: Metadata = { title: "Cross-meeting answers — Mytheus" };

export default function Page() {
  return <FeaturePage slug="context-gaps" />;
}
