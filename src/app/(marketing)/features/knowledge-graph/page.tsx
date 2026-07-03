import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/FeaturePage";

export const metadata: Metadata = { title: "Knowledge graph — Mytheus" };

export default function Page() {
  return <FeaturePage slug="knowledge-graph" />;
}
