"use client";

import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/marketing/PageShell";
import { Eyebrow } from "@/components/landing/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckBadge({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Page() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const trimmed = email.trim();
  const valid = EMAIL_RE.test(trimmed);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    setSubmitted(true);
  }

  return (
    <PageShell>
      <section className="mesh-field grain relative isolate flex min-h-[calc(100vh-9rem)] items-center justify-center overflow-hidden px-6 py-20 sm:py-24">
        <div className="relative z-10 w-full max-w-md rounded-card border border-line bg-white p-8 shadow-[0_30px_80px_-40px_rgba(40,30,20,0.35)] sm:p-10">
          {submitted ? (
            <div className="text-center">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-signal-soft text-signal-deep">
                <CheckBadge />
              </span>
              <h1 className="display mt-6 text-[clamp(1.6rem,3vw,2rem)]">
                You&apos;re all set.
              </h1>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-3">
                Check your inbox — we sent a verification link to{" "}
                <span className="font-medium text-ink">{trimmed}</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="mt-7 text-[14px] font-medium text-signal transition-colors hover:text-signal-deep"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <Eyebrow className="text-signal">Verify</Eyebrow>
              <h1 className="display mt-4 text-[clamp(1.7rem,3.2vw,2.2rem)]">
                Confirm you&apos;re a student.
              </h1>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-3">
                Enter your school email and we&apos;ll send a link to unlock
                Mytheus Pro — free for as long as you&apos;re enrolled.
              </p>

              <form onSubmit={onSubmit} className="mt-7" noValidate>
                <label
                  htmlFor="school-email"
                  className="kicker mb-2 block text-ink-2"
                >
                  School email
                </label>
                <input
                  id="school-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-pill border border-line bg-bg-2 px-5 py-3.5 text-[15px] text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-signal focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!valid}
                  className="mt-4 w-full rounded-pill bg-signal px-6 py-3.5 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-signal-deep disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send verification link
                </button>
              </form>

              <p className="mt-5 text-center text-[13px] text-ink-3">
                Takes under a minute. We&apos;ll only use this to confirm your
                status.
              </p>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
