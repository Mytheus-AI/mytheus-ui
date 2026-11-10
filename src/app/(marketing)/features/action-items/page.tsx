import { FeaturePage } from "@/components/marketing/FeaturePage";
import { featureMetadata } from "@/components/features/groups";

export const metadata = featureMetadata("action-items");

export default function Page() {
  return <FeaturePage slug="action-items" />;
}
