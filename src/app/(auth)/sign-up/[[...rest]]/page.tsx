import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpFlow } from "@/components/auth/SignUpFlow";

export const metadata: Metadata = { title: "Create your account · Mytheus" };

/**
 * Catch-all so `/sign-up/verify-email-address` and `/sign-up/continue` are real URLs.
 *
 * Signing up creates a Clerk user, NOT a tenant. The choose-organization session task
 * (`/onboarding/organization`) follows, and tenant provisioning stays the operator action
 * `POST /api/v1/orgs` describes.
 */
export default function Page({ params }: { params: { rest?: string[] } }) {
  return (
    <Suspense>
      <SignUpFlow segments={params.rest ?? []} />
    </Suspense>
  );
}
