import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/FeaturePage";

export const metadata: Metadata = { title: "Smart questions — Mytheus" };

export default function Page() {
  return <FeaturePage slug="smart-questions" />;
}
