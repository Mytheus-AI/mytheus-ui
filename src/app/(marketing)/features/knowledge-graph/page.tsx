import { FeaturePage } from "@/components/marketing/FeaturePage";
import { featureMetadata } from "@/components/features/groups";

export const metadata = featureMetadata("knowledge-graph");

export default function Page() {
  return <FeaturePage slug="knowledge-graph" />;
}
