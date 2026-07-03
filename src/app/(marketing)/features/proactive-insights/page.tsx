import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/FeaturePage";

export const metadata: Metadata = { title: "Proactive insights — Mytheus" };

export default function Page() {
  return <FeaturePage slug="proactive-insights" />;
}
