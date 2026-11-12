"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Doodle } from "@/components/ui/Doodle";
import { Wordmark } from "@/components/site/Wordmark";
import { authFontClass } from "@/lib/fonts";
import { AFTER_AUTH_URL } from "./clerk-helpers";
import "@/styles/app-theme.css";
import "@/styles/auth.css";

/* ================================================================== */
/*  The page Google sends you back to. Clerk finishes the OAuth        */
/*  handshake here and, when bot protection decides to, runs its       */
/*  human check in `#clerk-captcha`. A calm centred loader: a doodle   */
/*  being looked over with a magnifying glass, one line of status,     */
/*  and the challenge on a card under it when Clerk shows one.         */
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
        {/* a doodle under inspection: its strokes draw in while the glass sweeps over it */}
        <div className="relative mb-10 h-36 w-36" aria-hidden>
          <span className="block h-full w-full overflow-hidden rounded-full bg-surface shadow-warm-3 ring-[3px] ring-surface">
            <Doodle seed="human-check" draw className="block h-full w-full" />
          </span>
          <svg viewBox="0 0 120 120" className="auth-glass absolute -right-12 -top-8 h-28 w-28 overflow-visible">
            <circle cx="48" cy="48" r="30" fill="var(--surface)" fillOpacity={0.3} stroke="var(--pill)" strokeWidth={5} />
            <path d="M33 39 Q 39 29, 51 30" fill="none" stroke="var(--surface)" strokeWidth={4} strokeLinecap="round" />
            <path d="M70 70 L 100 100" stroke="var(--signal)" strokeWidth={10} strokeLinecap="round" />
          </svg>
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
