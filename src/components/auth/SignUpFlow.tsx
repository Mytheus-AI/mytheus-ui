"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useClerk, useSignUp } from "@clerk/nextjs";
import { AuthShell, type StageCopy } from "./AuthShell";
import {
  BackLink,
  CodeInput,
  FormAlert,
  GoogleButton,
  OrDivider,
  PasswordField,
  PasswordStrength,
  PrimaryButton,
  ResendCode,
  StepHeader,
  TextField,
} from "./fields";
import { TASK_URLS, firstError, toFieldErrors, useFinishAuth, useRedirectTarget, type FieldErrors } from "./clerk-helpers";
import { SsoCallback } from "./SsoCallback";

/* ================================================================== */
/*  Sign-up, as one URL-addressable flow:                              */
/*    /sign-up                        details, or Google               */
/*    /sign-up/verify-email-address   six-digit email code             */
/*    /sign-up/continue               anything Clerk still requires    */
/*                                    (e.g. after Google)              */
/*  Signing up creates a Clerk user, not a tenant: choosing or making  */
/*  an organization is the session task that follows.                  */
/* ================================================================== */

type Step = "start" | "verify" | "continue" | "sso-callback";

const STAGE: Record<Exclude<Step, "sso-callback">, StageCopy> = {
  start: {
    kicker: "Start free",
    title: "Every meeting,",
    accent: "on repeat.",
    blurb: "A personal agent for every person in the room. It listens, proposes, and remembers across meetings.",
  },
  verify: {
    kicker: "One last step",
    title: "Check your inbox.",
    accent: "We’ll wait.",
    blurb: "Confirming your email keeps your meetings, and everything your agent remembers, tied to you.",
  },
  continue: {
    kicker: "Almost there",
    title: "A few details",
    accent: "and you’re in.",
    blurb: "Your agent works better when it knows who it's working for.",
  },
};

export function SignUpFlow({ segments }: { segments: string[] }) {
  const first = segments[0];
  const step: Step =
    first === "verify-email-address" || first === "verify"
      ? "verify"
      : first === "continue"
        ? "continue"
        : first === "sso-callback"
          ? "sso-callback"
          : "start";

  const router = useRouter();
  const params = useSearchParams();
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const target = useRedirectTarget();

  useEffect(() => {
    if (step === "sso-callback") return;
    const pending = clerk.session?.status === "pending" ? (clerk.session.currentTask?.key as keyof typeof TASK_URLS | undefined) : undefined;
    if (pending && TASK_URLS[pending]) router.replace(TASK_URLS[pending]);
    else if (isSignedIn) router.replace(target);
  }, [step, isSignedIn, clerk.session, router, target]);

  if (step === "sso-callback") return <SsoCallback />;

  const qs = params.toString() ? `?${params.toString()}` : "";
  const go = (path: string) => router.push(`${path}${qs}`);

  return (
    <AuthShell
      stage={STAGE[step]}
      aside={
        <span className="inline-flex items-center gap-3">
          <span className="hidden whitespace-nowrap md:inline">Have an account?</span>
          <Link
            href={`/sign-in${qs}`}
            className="pill-surface inline-flex h-10 items-center whitespace-nowrap rounded-pill px-4 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Sign in
          </Link>
        </span>
      }
    >
      {step === "verify" ? <VerifyStep go={go} /> : step === "continue" ? <ContinueStep go={go} /> : <StartStep go={go} />}
    </AuthShell>
  );
}

/** Route a sign-up attempt to whatever it needs next. */
function useAdvance(go: (p: string) => void) {
  const finish = useFinishAuth();
  return async (res: { status: string | null; createdSessionId: string | null; unverifiedFields: string[]; missingFields: string[]; prepareEmailAddressVerification: (p: { strategy: "email_code" }) => Promise<unknown> }) => {
    if (res.status === "complete") return finish(res.createdSessionId);
    if (res.unverifiedFields.includes("email_address")) {
      await res.prepareEmailAddressVerification({ strategy: "email_code" });
      return go("/sign-up/verify-email-address");
    }
    return go("/sign-up/continue");
  };
}

/* ---------------- /sign-up ---------------- */

function StartStep({ go }: { go: (p: string) => void }) {
  const { isLoaded, signUp } = useSignUp();
  const advance = useAdvance(go);
  const target = useRedirectTarget();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<"form" | "google" | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Enter your email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (Object.keys(next).length) return setErrors(next);
    setErrors({});
    setBusy("form");
    try {
      const res = await signUp.create({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        emailAddress: email.trim(),
        password,
      });
      await advance(res);
    } catch (err) {
      setErrors(toFieldErrors(err));
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    if (!isLoaded) return;
    setBusy("google");
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: target,
      });
    } catch (err) {
      setErrors({ form: firstError(err) });
      setBusy(null);
    }
  };

  return (
    <>
      <StepHeader kicker="Create your account" title="Meet your agent.">
        Free to start. Your agent proposes; nothing is saved until you confirm it.
      </StepHeader>

      {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}

      <div className="auth-rise" style={{ ["--d" as string]: "80ms" }}>
        <GoogleButton onClick={google} loading={busy === "google"} disabled={!!busy}>
          Sign up with Google
        </GoogleButton>
      </div>
      <OrDivider>or with email</OrDivider>

      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="auth-rise grid grid-cols-2 gap-3" style={{ ["--d" as string]: "140ms" }}>
          <TextField label="First name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} autoFocus />
          <TextField label="Last name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} />
        </div>
        <div className="auth-rise space-y-4" style={{ ["--d" as string]: "190ms" }}>
          <TextField
            label="Work email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email ?? errors.identifier}
          />
          <div>
            <PasswordField
              label="Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <PasswordStrength value={password} />
          </div>
        </div>

        {/* Clerk's bot protection mounts its widget here when it decides to show one. */}
        <div id="clerk-captcha" className="flex justify-center rounded-2xl border border-line bg-white p-3" />

        <div className="auth-rise pt-3" style={{ ["--d" as string]: "250ms" }}>
          <PrimaryButton loading={busy === "form"} disabled={busy === "google"}>
            Create account
          </PrimaryButton>
        </div>
        <p className="auth-rise text-center text-[13px] leading-relaxed text-ink-3" style={{ ["--d" as string]: "300ms" }}>
          By creating an account you agree to our{" "}
          <Link href="/terms" className="link-underline text-ink-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="link-underline text-ink-2">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </>
  );
}

/* ---------------- /sign-up/verify-email-address ---------------- */

function VerifyStep({ go }: { go: (p: string) => void }) {
  const { isLoaded, signUp } = useSignUp();
  const advance = useAdvance(go);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const arrived = useRef(false);

  // Only on arrival: nothing to verify means the attempt was lost (reload, new tab).
  useEffect(() => {
    if (!isLoaded || arrived.current) return;
    arrived.current = true;
    if (!signUp.id || !signUp.emailAddress) go("/sign-up");
  }, [isLoaded, signUp, go]);

  const verify = async (value = code) => {
    if (!isLoaded || value.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: value });
      if (res.status === "complete" || !res.unverifiedFields.includes("email_address")) await advance(res);
    } catch (err) {
      setError(firstError(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BackLink onClick={() => go("/sign-up")}>Wrong email? Go back</BackLink>
      <StepHeader kicker="Verify your email" title="Enter your code.">
        We sent a six-digit code to <span className="font-medium text-ink">{isLoaded ? signUp.emailAddress : "your inbox"}</span>.
        It expires in ten minutes.
      </StepHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
        className="auth-rise space-y-7"
        style={{ ["--d" as string]: "100ms" }}
      >
        <CodeInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} error={error} disabled={busy} />
        <PrimaryButton loading={busy} disabled={code.length < 6}>
          Verify email
        </PrimaryButton>
        <ResendCode
          onResend={async () => {
            try {
              await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
            } catch (err) {
              setError(firstError(err));
            }
          }}
        />
      </form>
    </>
  );
}

/* ---------------- /sign-up/continue ---------------- */

function ContinueStep({ go }: { go: (p: string) => void }) {
  const { isLoaded, signUp } = useSignUp();
  const clerk = useClerk();
  const advance = useAdvance(go);
  const [values, setValues] = useState({ firstName: "", lastName: "", password: "", username: "" });
  const [legal, setLegal] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const arrived = useRef(false);

  useEffect(() => {
    if (!isLoaded || arrived.current) return;
    arrived.current = true;
    if (!signUp.id) go("/sign-up");
    else setValues((v) => ({ ...v, firstName: signUp.firstName ?? "", lastName: signUp.lastName ?? "" }));
  }, [isLoaded, signUp, go]);

  const missing = new Set(isLoaded ? signUp.missingFields : []);
  const needs = {
    firstName: missing.has("first_name"),
    lastName: missing.has("last_name"),
    password: missing.has("password"),
    username: missing.has("username"),
    legal: missing.has("legal_accepted"),
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (needs.legal && !legal) return setErrors({ form: "Please accept the Terms and Privacy Policy to continue." });
    setBusy(true);
    setErrors({});
    try {
      const res = await signUp.update({
        ...(needs.firstName ? { firstName: values.firstName.trim() } : {}),
        ...(needs.lastName ? { lastName: values.lastName.trim() } : {}),
        ...(needs.password ? { password: values.password } : {}),
        ...(needs.username ? { username: values.username.trim() } : {}),
        ...(needs.legal ? { legalAccepted: true } : {}),
      });
      await advance(res);
    } catch (err) {
      setErrors(toFieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <>
      <BackLink
        onClick={async () => {
          await clerk.signOut().catch(() => undefined);
          go("/sign-up");
        }}
      >
        Start over
      </BackLink>
      <StepHeader kicker="Finish signing up" title="Just a few details.">
        {signUp?.emailAddress ? (
          <>
            You&rsquo;re signing up as <span className="font-medium text-ink">{signUp.emailAddress}</span>.
          </>
        ) : (
          "We need a little more before your agent can start."
        )}
      </StepHeader>
      {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}
      <form onSubmit={submit} noValidate className="auth-rise space-y-4" style={{ ["--d" as string]: "100ms" }}>
        {needs.firstName || needs.lastName ? (
          <div className="grid grid-cols-2 gap-3">
            {needs.firstName ? <TextField label="First name" autoComplete="given-name" value={values.firstName} onChange={set("firstName")} error={errors.firstName} autoFocus /> : null}
            {needs.lastName ? <TextField label="Last name" autoComplete="family-name" value={values.lastName} onChange={set("lastName")} error={errors.lastName} /> : null}
          </div>
        ) : null}
        {needs.username ? <TextField label="Username" autoComplete="username" value={values.username} onChange={set("username")} /> : null}
        {needs.password ? (
          <div>
            <PasswordField label="Password" autoComplete="new-password" value={values.password} onChange={set("password")} error={errors.password} />
            <PasswordStrength value={values.password} />
          </div>
        ) : null}
        {needs.legal ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-4 text-[14px] leading-relaxed text-ink-2">
            <input
              type="checkbox"
              checked={legal}
              onChange={(e) => setLegal(e.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--signal)]"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="link-underline text-ink">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="link-underline text-ink">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        ) : null}
        <div id="clerk-captcha" className="flex justify-center rounded-2xl border border-line bg-white p-3" />
        <div className="pt-3">
          <PrimaryButton loading={busy}>Continue</PrimaryButton>
        </div>
      </form>
    </>
  );
}
