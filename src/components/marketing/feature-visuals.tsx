import type { ReactNode } from "react";
import type { VisualKey } from "@/lib/marketing/features";
import { AgentVisual } from "@/components/features/visuals/agent";
import { NotesVisual } from "@/components/features/visuals/notes";
import { SuggestionsVisual } from "@/components/features/visuals/suggestions";
import { DecisionVisual } from "@/components/features/visuals/decision";
import { TasksVisual } from "@/components/features/visuals/tasks";
import { ExchangeVisual } from "@/components/features/visuals/exchange";
import { CapacityVisual } from "@/components/features/visuals/capacity";
import { CaptionsVisual } from "@/components/features/visuals/captions";
import { SearchVisual } from "@/components/features/visuals/search";
import { GraphVisual } from "@/components/features/visuals/graph";
import { IntegrationsVisual } from "@/components/features/visuals/integrations";

/* The product window for each feature page, picked by the serializable `visual` key in
   features.ts. Each one is a realistic window (Win + WinBar, chips in the frozen priority tones,
   Phosphor icons, aligned rows) built from src/components/features/*. They are server components;
   the only client code is the InView inside each window's <Demo>, which starts its one timed
   moment when it scrolls into view. Reduced motion shows every window in its final state. */

export const FEATURE_VISUALS: Record<VisualKey, () => ReactNode> = {
  agent: AgentVisual,
  notes: NotesVisual,
  suggestions: SuggestionsVisual,
  decision: DecisionVisual,
  tasks: TasksVisual,
  exchange: ExchangeVisual,
  capacity: CapacityVisual,
  captions: CaptionsVisual,
  search: SearchVisual,
  graph: GraphVisual,
  integrations: IntegrationsVisual,
};

export function FeatureVisual({ visual }: { visual: VisualKey }) {
  const Visual = FEATURE_VISUALS[visual];
  return <Visual />;
}
