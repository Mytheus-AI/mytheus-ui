import { FeaturePage } from "@/components/marketing/FeaturePage";
import { featureMetadata } from "@/components/features/groups";

export const metadata = featureMetadata("proactive-insights");

export default function Page() {
  return <FeaturePage slug="proactive-insights" />;
}
