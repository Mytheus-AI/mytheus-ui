import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/FeaturePage";

export const metadata: Metadata = { title: "Action items — Mytheus" };

export default function Page() {
  return <FeaturePage slug="action-items" />;
}
