"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { LogoMark } from "@/components/Logo";
import { Doodle } from "@/components/ui/Doodle";
import { authFontClass } from "@/lib/fonts";
import { AFTER_AUTH_URL } from "./clerk-helpers";
import "@/styles/auth.css";

/* ================================================================== */
/*  The page Google sends you back to. Clerk finishes the OAuth        */
/*  handshake here and, when bot protection decides to, runs its       */
/*  human check in `#clerk-captcha`. Drawn in the same sketchbook as   */
/*  the rest of auth: a doodle being looked over with a magnifying     */
/*  glass, and a handwritten checklist ticking itself off. The         */
/*  challenge, when Clerk shows one, sits on a card under it.          */
/* ================================================================== */

const STEPS = ["Google says hello", "Checking you're not a robot", "Opening your workspace"];

export function SsoCallback() {
  const [slow, setSlow] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 12000);
    // The checklist is pacing, not progress: Clerk gives no progress events. It stops one short
    // of the end, so it never claims to be finished before the redirect actually happens.
    const ticks = [setTimeout(() => setDone(1), 700), setTimeout(() => setDone(2), 2200)];
    return () => {
      clearTimeout(t);
      ticks.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className={`mx-auth ${authFontClass} doodle-sheet relative flex min-h-[100dvh] flex-col overflow-hidden`}>
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-[23px] font-semibold tracking-[-0.04em] text-ink">
          <LogoMark size={24} />
          Mytheus
        </Link>
        <span className="font-hand -rotate-2 text-[21px] font-medium text-ink-3">security check</span>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        {/* a doodle under inspection */}
        <div className="relative mb-10 h-44 w-44" aria-hidden>
          <span className="absolute inset-3 block overflow-hidden rounded-full border-[2.5px] border-[var(--doodle-ink)]">
            <Doodle seed="human-check" draw className="block h-full w-full" />
          </span>
          <svg viewBox="0 0 120 120" className="sso-glass absolute -right-10 -top-6 h-28 w-28">
            <circle cx="48" cy="48" r="30" fill="rgba(255,250,240,0.35)" stroke="var(--doodle-ink)" strokeWidth="5" />
            <path d="M34 38 Q 40 28, 52 30" fill="none" stroke="#fffaf0" strokeWidth="4" strokeLinecap="round" />
            <path d="M70 70 L 102 102" stroke="var(--doodle-ink)" strokeWidth="10" strokeLinecap="round" />
            <path d="M70 70 L 102 102" stroke="var(--signal)" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>

        <p className="kicker auth-rise mb-4">Verifying your sign-in</p>
        <h1
          className="display auth-rise max-w-[15ch] text-balance text-[clamp(2.4rem,5.6vw,4.2rem)] text-ink-display"
          style={{ ["--d" as string]: "80ms" }}
        >
          Just making sure you&rsquo;re <em className="text-signal-deep">human.</em>
        </h1>

        <ul className="auth-rise mt-8 space-y-1.5 text-left" style={{ ["--d" as string]: "160ms" }} aria-live="polite">
          {STEPS.map((s, i) => {
            const ticked = i < done;
            const current = i === done;
            return (
              <li key={s} className={`font-hand flex items-center gap-3 text-[24px] leading-tight ${ticked || current ? "text-ink" : "text-ink-3/60"}`}>
                <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border-[2px] border-[var(--doodle-ink)] bg-[var(--doodle-paper)]">
                  {ticked ? (
                    <svg viewBox="0 0 24 24" className="absolute -top-1.5 left-0.5 h-7 w-7" aria-hidden>
                      <path d="M4 13 L10 19 L22 3" fill="none" stroke="var(--signal)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="doodle-draw" />
                    </svg>
                  ) : current ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--doodle-ink)]" />
                  ) : null}
                </span>
                <span>
                  {s}
                  {current ? "..." : ""}
                </span>
                <span className="sr-only">{ticked ? " done" : current ? " in progress" : ""}</span>
              </li>
            );
          })}
        </ul>

        {/* Clerk mounts its challenge here only when it needs one; the slot is hidden while empty. */}
        <div
          id="clerk-captcha"
          className="mt-8 min-w-[300px] rounded-[20px] border-[1.5px] border-line-2 bg-surface p-4"
        />

        <div className="mt-8 h-6 text-[14px] text-ink-3" aria-live="polite">
          {slow ? (
            <span className="auth-rise inline-block">
              Taking longer than usual?{" "}
              <Link href="/sign-in" className="link-underline font-semibold text-ink-2 hover:text-ink">
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
