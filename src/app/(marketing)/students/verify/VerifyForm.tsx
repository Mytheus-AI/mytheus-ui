"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/* The student verification form. Logic is unchanged from the original page: the address must
   look like an email, the submit stays disabled until it does, and submitting shows the
   confirmation with a way back. Presentation adds an inline hint once the field has been left
   with an address that does not look right. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function VerifyForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  const trimmed = email.trim();
  const valid = EMAIL_RE.test(trimmed);
  const showError = touched && trimmed.length > 0 && !valid;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div role="status" className="text-center">
        <CheckCircle aria-hidden weight="regular" className="mx-auto h-12 w-12 text-ok" />
        <h2 className="display mt-4 text-[clamp(1.6rem,3vw,2rem)]">You&apos;re all set.</h2>
        <p className="mx-auto mt-3 max-w-[36ch] text-[16px] leading-relaxed text-ink-3">
          Check your inbox. We sent a verification link to <span className="break-all font-semibold text-ink">{trimmed}</span>.
        </p>
        <Button
          type="button"
          variant="ghost"
          className="mt-5"
          onClick={() => {
            setSubmitted(false);
            setEmail("");
            setTouched(false);
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 className="font-display text-[1.5rem] font-medium tracking-[-0.015em] text-ink">Unlock Mytheus Pro</h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-3">We&apos;ll send a verification link to your school inbox.</p>
      <div className="mt-5">
        <Input
          id="school-email"
          name="email"
          type="email"
          label="School email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showError || undefined}
          error={showError ? "That doesn't look like an email address. Check for a typo." : undefined}
          className="h-12 text-[16px]"
        />
      </div>
      <Button type="submit" size="lg" disabled={!valid} className="mt-4 w-full">
        Send verification link
      </Button>
      <p className="mt-4 text-center text-[14px] leading-relaxed text-ink-3">
        Takes under a minute. We&apos;ll only use this to confirm your status.
      </p>
    </form>
  );
}
