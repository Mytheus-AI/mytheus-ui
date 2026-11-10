"use client";

import { OnboardingError } from "@/components/onboarding/OnboardingError";

export default function StepError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OnboardingError title="Your agent listens for your work." reset={reset} />;
}
