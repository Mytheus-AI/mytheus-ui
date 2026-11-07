import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInFlow } from "@/components/auth/SignInFlow";

export const metadata: Metadata = { title: "Sign in · Mytheus" };

/**
 * Catch-all so every step of sign-in (`/sign-in/factor-one`, `/factor-two`,
 * `/forgot-password`, `/sso-callback`) is a real URL Clerk can redirect to. The old
 * non-catch-all page is what made Clerk's components refuse to render.
 */
export default function Page({ params }: { params: { rest?: string[] } }) {
  return (
    <Suspense>
      <SignInFlow segments={params.rest ?? []} />
    </Suspense>
  );
}
