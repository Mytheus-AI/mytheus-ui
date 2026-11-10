"use client";

import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormAlert, PrimaryButton, StepHeader } from "@/components/auth/fields";

/** When a step's page fails to render: say so, offer a retry, and never trap the person. */
export function OnboardingError({ title, reset }: { title: string; reset: () => void }) {
  return (
    <AuthShell stage={{ title }} scene={{ you: "empty" }}>
      <StepHeader title="This step didn't load">Your workspace is ready; only this page failed.</StepHeader>
      <FormAlert>Something went wrong on our side. Try again, or go on to your dashboard and finish this later.</FormAlert>
      <PrimaryButton type="button" onClick={reset}>
        Try again
      </PrimaryButton>
      <p className="mt-4 text-center text-[14px]">
        <Link
          href="/dashboard"
          className="rounded-[4px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal"
        >
          Go to your dashboard
        </Link>
      </p>
    </AuthShell>
  );
}
