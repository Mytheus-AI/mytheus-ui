"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { LogoMark } from "@/components/Logo";
import { Wordmark } from "@/components/site/Wordmark";
import { authFontClass } from "@/lib/fonts";
import { AFTER_AUTH_URL } from "./clerk-helpers";
import "@/styles/auth.css";

/* ================================================================== */
/*  The page Google sends you back to. Clerk finishes the OAuth        */
/*  handshake here and, when bot protection decides to, runs its       */
/*  human check in `#clerk-captcha`. A calm centred loader: the mark   */
/*  drawing itself, one line of status, and the challenge on a card    */
/*  under it when Clerk shows one.                                     */
/* ================================================================== */

const STEPS = ["Confirming with Google", "Checking it's you", "Opening your workspace"];

export function SsoCallback() {
  const [slow, setSlow] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 12000);
    // The status line is pacing, not progress: Clerk gives no progress events. It stops on the
    // last step, so it never claims to be finished before the redirect actually happens.
    const ticks = [setTimeout(() => setDone(1), 700), setTimeout(() => setDone(2), 2200)];
    return () => {
      clearTimeout(t);
      ticks.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className={`mx-auth ${authFontClass} flex min-h-[100dvh] flex-col bg-bg`}>
      <header className="flex min-h-[44px] items-center px-4 pt-4 sm:px-8">
        <Link href="/" aria-label="Mytheus home" className="group inline-flex items-center rounded-ctl">
          <Wordmark size={22} textClassName="text-[22px]" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20 text-center">
        <div className="auth-logo-loop mb-8" aria-hidden>
          <LogoMark size={52} />
        </div>

        <h1 className="display text-[clamp(1.875rem,4vw,2.5rem)]">Signing you in</h1>
        <p className="mt-3 min-h-[1.6em] text-[16px] text-ink-3" role="status" aria-live="polite">
          {STEPS[done]}
        </p>

        {/* Clerk mounts its challenge here only when it needs one; the slot is hidden while empty. */}
        <div id="clerk-captcha" className="mt-8 min-w-[300px] max-w-full rounded-card border border-line bg-surface p-4 shadow-warm-2" />

        <div className="mt-8 min-h-[24px] text-[14px] text-ink-3" aria-live="polite">
          {slow ? (
            <span>
              Taking longer than usual?{" "}
              <Link
                href="/sign-in"
                className="rounded-[4px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal"
              >
                Start over
              </Link>
            </span>
          ) : null}
        </div>
      </main>

      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        firstFactorUrl="/sign-in/factor-one"
        secondFactorUrl="/sign-in/factor-two"
        resetPasswordUrl="/sign-in/forgot-password"
        continueSignUpUrl="/sign-up/continue"
        verifyEmailAddressUrl="/sign-up/verify-email-address"
        signInFallbackRedirectUrl={AFTER_AUTH_URL}
        signUpFallbackRedirectUrl={AFTER_AUTH_URL}
      />
    </div>
  );
}
