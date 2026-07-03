import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/FeaturePage";

export const metadata: Metadata = { title: "Live notes — Mytheus" };

export default function Page() {
  return <FeaturePage slug="live-notes" />;
}
