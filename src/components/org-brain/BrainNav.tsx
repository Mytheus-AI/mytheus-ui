"use client";

import { BookOpenText, Brain, Buildings, CalendarDots, Prohibit, Target, UserFocus } from "@phosphor-icons/react";
import { TabNav } from "@/components/ui/TabNav";

/* The company brain's own sections, as the secondary list inside its Workspace tab: down the
   side from lg up, a sideways row below. Each section with a readiness check carries a dot
   (filled when done, a ring when not); Meeting types has no check, so no dot. */

export const BRAIN_SECTIONS = [
  { href: "/workspace/brain", label: "Overview", icon: Brain, check: null },
  { href: "/workspace/brain/about", label: "About", icon: Buildings, check: "profile" },
  { href: "/workspace/brain/vocabulary", label: "Vocabulary", icon: BookOpenText, check: "vocabulary" },
  { href: "/workspace/brain/owners", label: "Who owns what", icon: UserFocus, check: "owners" },
  { href: "/workspace/brain/goals", label: "Goals", icon: Target, check: "goals" },
  { href: "/workspace/brain/meeting-types", label: "Meeting types", icon: CalendarDots, check: null },
  { href: "/workspace/brain/ground-rules", label: "Ground rules", icon: Prohibit, check: "ground_rules" },
] as const;

export function BrainNav({ done }: { done: Record<string, boolean> | null }) {
  return (
    <TabNav
      label="Company brain sections"
      orientation="vertical"
      exact={["/workspace/brain"]}
      items={BRAIN_SECTIONS.map((s) => ({
        href: s.href,
        label: s.label,
        icon: s.icon,
        dot: s.check && done ? (done[s.check] ?? null) : null,
      }))}
    />
  );
}
