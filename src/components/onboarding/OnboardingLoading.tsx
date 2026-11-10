"use client";

import { AuthShell } from "@/components/auth/AuthShell";
import { StepLoading } from "./fields";

/** The onboarding frame while a step's server data loads, so the page never flashes blank. */
export function OnboardingLoading({ title, label }: { title: string; label: string }) {
  return (
    <AuthShell stage={{ title }} scene={{ you: "empty" }}>
      <StepLoading label={label} />
    </AuthShell>
  );
}
