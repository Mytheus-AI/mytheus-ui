"use client";

import { OnboardingError } from "@/components/onboarding/OnboardingError";

export default function StepError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OnboardingError title="A face and a voice of its own." reset={reset} />;
}
