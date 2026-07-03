import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/FeaturePage";

export const metadata: Metadata = { title: "Integrations — Mytheus" };

export default function Page() {
  return <FeaturePage slug="integrations" />;
}
