import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/FeaturePage";

export const metadata: Metadata = { title: "Live transcription — Mytheus" };

export default function Page() {
  return <FeaturePage slug="transcription" />;
}
