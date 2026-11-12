import type { Metadata } from "next";
import { AGENT_SLUGS, FEATURES, getFeature, type FeatureDef } from "@/lib/marketing/features";

/* How the feature pages are grouped, matching the footer's two columns. The grouping itself is
   AGENT_SLUGS in src/lib/marketing/features.ts. */

export { AGENT_SLUGS };

export const GROUPS: { title: string; features: FeatureDef[] }[] = [
  { title: "Your Myte", features: FEATURES.filter((f) => AGENT_SLUGS.includes(f.slug)) },
  { title: "Platform", features: FEATURES.filter((f) => !AGENT_SLUGS.includes(f.slug)) },
];

/** The next features in the same group, wrapping around: the page's closest neighbours. */
export function neighbours(slug: string, count = 3): FeatureDef[] {
  const group = GROUPS.find((g) => g.features.some((f) => f.slug === slug))?.features ?? FEATURES;
  const i = group.findIndex((f) => f.slug === slug);
  const out: FeatureDef[] = [];
  for (let k = 1; k < group.length && out.length < count; k++) out.push(group[(i + k) % group.length]);
  return out;
}

export function featureMetadata(slug: string): Metadata {
  const f = getFeature(slug);
  return { title: `${f.nav} | Mytheus`, description: f.blurb };
}
