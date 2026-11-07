"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { LogoMark } from "@/components/Logo";
import { ConnectedGraph } from "@/components/landing/ConnectedGraph";
import { AFTER_AUTH_URL } from "./clerk-helpers";

/* ================================================================== */
/*  The page Google sends you back to. Clerk finishes the OAuth        */
/*  handshake here and, when bot protection decides to, runs its       */
/*  human check in `#clerk-captcha`. Instead of a blank screen, it is  */
/*  a full-bleed security moment: breathing rings around the mark,     */
/*  and the challenge (if one is needed) on a card in the middle.      */
/* ================================================================== */

export function SsoCallback() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mesh-field mesh-anim grain relative flex min-h-[100dvh] flex-col overflow-hidden bg-bg">
      <ConnectedGraph signal className="pointer-events-none absolute inset-0 opacity-35" nodeCount={30} />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,119,87,0.16),transparent)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-[24px] font-medium tracking-[-0.05em] text-ink">
          <LogoMark size={24} />
          Mytheus
        </Link>
        <span className="kicker">Security check</span>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        {/* the mark at the centre of three breathing rings */}
        <div className="relative mb-12 flex h-40 w-40 items-center justify-center" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="auth-ring absolute inset-0 rounded-full border border-signal-bright"
              style={{ animationDelay: `${i * 1.2}s` }}
            />
          ))}
          <span className="absolute inset-6 rounded-full border border-line bg-white/80 shadow-[0_30px_60px_-30px_rgba(189,93,58,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm" />
          <span className="logo-breathe relative">
            <LogoMark size={34} />
          </span>
        </div>

        <p className="kicker auth-rise mb-5 flex items-center gap-2.5">
          <span className="glow-pulse inline-block h-1.5 w-1.5 rounded-full bg-signal" />
          Verifying your sign-in
        </p>
        <h1
          className="display display-tight auth-rise max-w-[14ch] text-balance text-[clamp(2.6rem,6.4vw,5rem)]"
          style={{ ["--d" as string]: "80ms" }}
        >
          Just making sure you&rsquo;re <span className="text-gradient-signal">human.</span>
        </h1>
        <p
          className="auth-rise mt-6 max-w-[44ch] text-pretty text-[16px] leading-relaxed text-ink-3"
          style={{ ["--d" as string]: "160ms" }}
        >
          We&rsquo;re finishing your Google sign-in and running a quick check that keeps bots out of everyone&rsquo;s
          meetings. Usually this takes a second or two.
        </p>

        {/* Clerk mounts its challenge here only when it needs one; the slot is hidden while empty. */}
        <div
          id="clerk-captcha"
          className="auth-rise mt-10 min-w-[300px] rounded-[22px] border border-line bg-white/90 p-4 shadow-[0_40px_80px_-40px_rgba(40,30,20,0.45)] backdrop-blur-sm"
          style={{ ["--d" as string]: "240ms" }}
        />

        <div className="mt-10 h-6 text-[14px] text-ink-3" aria-live="polite">
          {slow ? (
            <span className="auth-rise inline-block">
              Taking longer than usual?{" "}
              <Link href="/sign-in" className="link-underline font-medium text-ink-2 hover:text-ink">
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
