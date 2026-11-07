"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import { AuthShell, type StageCopy } from "./AuthShell";
import type { SceneProps } from "./DoodleTable";
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
  TextButton,
  TextField,
} from "./fields";
import { TASK_URLS, firstError, toFieldErrors, useFinishAuth, useRedirectTarget, type FieldErrors } from "./clerk-helpers";
import { SsoCallback } from "./SsoCallback";

/* ================================================================== */
/*  Sign-in, as one URL-addressable flow:                              */
/*    /sign-in                   email + password, or Google           */
/*    /sign-in/factor-one        a one-time code by email              */
/*    /sign-in/factor-two        two-step verification                 */
/*    /sign-in/forgot-password   reset by emailed code                 */
/*  Steps share Clerk's in-progress `signIn`, so moving between URLs   */
/*  keeps the attempt alive.                                           */
/* ================================================================== */

type Step = "start" | "factor-one" | "factor-two" | "forgot-password" | "sso-callback" | "task";

const STAGE: Record<Exclude<Step, "sso-callback" | "task">, StageCopy> = {
  start: {
    kicker: "Welcome back",
    title: "Pick up where",
    accent: "the room left off.",
    blurb: "Your agent kept the thread while you were away. Decisions, owners and open questions are waiting.",
  },
  "factor-one": {
    kicker: "One-time code",
    title: "No password?",
    accent: "No problem.",
    blurb: "We'll email a six-digit code. It works once and expires in minutes.",
  },
  "factor-two": {
    kicker: "Two-step verification",
    title: "Two keys,",
    accent: "one you.",
    blurb: "A second check keeps every meeting you've had exactly where it belongs: with you.",
  },
  "forgot-password": {
    kicker: "Account recovery",
    title: "A new key.",
    accent: "Same memory.",
    blurb: "Resetting your password changes how you get in. Nothing your agent remembers is touched.",
  },
};

/* What the drawn meeting talks about on each step. */
const SCENES: Record<Exclude<Step, "sso-callback" | "task">, SceneProps> = {
  start: {},
  "factor-one": {
    lines: [
      { text: "Forgot the password again?" },
      { text: "A code's on its way." },
      { text: "One code, one use. Done.", decision: true },
    ],
    note: "Code sent, expires soon",
  },
  "factor-two": {
    lines: [
      { text: "Second key, please." },
      { text: "Authenticator open?" },
      { text: "Both keys check out.", decision: true },
    ],
    note: "Two-step verified",
  },
  "forgot-password": {
    lines: [
      { text: "New password, same memories?" },
      { text: "Nothing gets lost." },
      { text: "Reset it by email.", decision: true },
    ],
    note: "Password reset, history kept",
  },
};

/** The email-code factor Clerk offers for this identifier, if any. */
function emailCodeFactor(factors: readonly { strategy: string }[] | null | undefined) {
  const f = factors?.find((x) => x.strategy === "email_code");
  return f && "emailAddressId" in f && typeof f.emailAddressId === "string" ? { emailAddressId: f.emailAddressId } : undefined;
}

const EMAIL_KEY = "mytheus:auth-email";
const rememberEmail = (v: string) => {
  try {
    sessionStorage.setItem(EMAIL_KEY, v);
  } catch {
    /* storage can be blocked; prefill is a convenience only */
  }
};
const recallEmail = () => {
  try {
    return sessionStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
};

export function SignInFlow({ segments }: { segments: string[] }) {
  const first = segments[0];
  const step: Step =
    first === "factor-one" || first === "factor-two" || first === "forgot-password" || first === "sso-callback"
      ? first
      : first === "tasks"
        ? "task"
        : "start";

  const router = useRouter();
  const params = useSearchParams();
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const target = useRedirectTarget();

  // Already signed in: leave. A session that still owes a task goes to that task.
  useEffect(() => {
    if (step === "sso-callback") return;
    const pending = clerk.session?.status === "pending" ? (clerk.session.currentTask?.key as keyof typeof TASK_URLS | undefined) : undefined;
    if (pending && TASK_URLS[pending]) router.replace(TASK_URLS[pending]);
    else if (isSignedIn) router.replace(target);
  }, [step, isSignedIn, clerk.session, router, target]);

  if (step === "sso-callback") return <SsoCallback />;

  const qs = params.toString() ? `?${params.toString()}` : "";
  const go = (path: string) => router.push(`${path}${qs}`);
  const stage = STAGE[step === "task" ? "start" : step];
  const scene = SCENES[step === "task" ? "start" : step];

  return (
    <AuthShell
      stage={stage}
      scene={scene}
      aside={
        <span className="inline-flex items-center gap-3">
          <span className="hidden whitespace-nowrap md:inline">New to Mytheus?</span>
          <Link
            href={`/sign-up${qs}`}
            className="inline-flex h-10 items-center whitespace-nowrap rounded-full border-[1.5px] border-line-2 bg-surface px-4 text-[14px] font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
          >
            Create an account
          </Link>
        </span>
      }
    >
      {step === "factor-one" ? (
        <EmailCodeStep go={go} />
      ) : step === "factor-two" ? (
        <SecondFactorStep go={go} />
      ) : step === "forgot-password" ? (
        <ForgotPasswordStep go={go} />
      ) : (
        <StartStep go={go} />
      )}
    </AuthShell>
  );
}

/* ---------------- /sign-in ---------------- */

function StartStep({ go }: { go: (p: string) => void }) {
  const { isLoaded, signIn } = useSignIn();
  const finish = useFinishAuth();
  const target = useRedirectTarget();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<"password" | "code" | "google" | null>(null);

  useEffect(() => setEmail((e) => e || recallEmail()), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (!email.trim()) return setErrors({ identifier: "Enter your email address." });
    if (!password) return setErrors({ password: "Enter your password." });
    setErrors({});
    setBusy("password");
    rememberEmail(email.trim());
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      if (res.status === "complete") await finish(res.createdSessionId);
      else if (res.status === "needs_second_factor") go("/sign-in/factor-two");
      else if (res.status === "needs_new_password") go("/sign-in/forgot-password");
      else setErrors({ form: "This account needs another way in. Try an email code instead." });
    } catch (err) {
      setErrors(toFieldErrors(err));
    } finally {
      setBusy(null);
    }
  };

  const emailCode = async () => {
    if (!isLoaded) return;
    if (!email.trim()) return setErrors({ identifier: "Enter your email first, and we'll send the code there." });
    setErrors({});
    setBusy("code");
    rememberEmail(email.trim());
    try {
      const res = await signIn.create({ identifier: email.trim() });
      const factor = emailCodeFactor(res.supportedFirstFactors);
      if (!factor) {
        setErrors({ form: "Email codes aren't enabled for this account. Use your password or Google." });
        return;
      }
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      go("/sign-in/factor-one");
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
      await signIn.authenticateWithRedirect({
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
      <StepHeader kicker="Sign in" title="Welcome back.">
        Sign in to see what your agent caught since your last meeting.
      </StepHeader>

      {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}

      <div className="auth-rise" style={{ ["--d" as string]: "80ms" }}>
        <GoogleButton onClick={google} loading={busy === "google"} disabled={!!busy} />
      </div>
      <OrDivider>or with email</OrDivider>

      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="auth-rise space-y-4" style={{ ["--d" as string]: "140ms" }}>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.identifier}
            autoFocus
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        </div>
        <div className="auth-rise flex items-center justify-between pt-1" style={{ ["--d" as string]: "200ms" }}>
          <TextButton onClick={emailCode} disabled={!!busy}>
            {busy === "code" ? "Sending code…" : "Email me a code instead"}
          </TextButton>
          <TextButton
            onClick={() => {
              rememberEmail(email.trim());
              go("/sign-in/forgot-password");
            }}
          >
            Forgot password?
          </TextButton>
        </div>
        <div className="auth-rise pt-4" style={{ ["--d" as string]: "260ms" }}>
          <PrimaryButton loading={busy === "password"} disabled={!!busy && busy !== "password"}>
            Sign in
          </PrimaryButton>
        </div>
      </form>
    </>
  );
}

/* ---------------- /sign-in/factor-one ---------------- */

function EmailCodeStep({ go }: { go: (p: string) => void }) {
  const { isLoaded, signIn } = useSignIn();
  const finish = useFinishAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const checked = useRef(false);

  // Arriving from the start step, a code is already on its way. Arriving cold (a reload or
  // a direct link), ask for the email first.
  useEffect(() => {
    if (!isLoaded || checked.current) return;
    checked.current = true;
    const v = signIn.firstFactorVerification;
    if (signIn.status === "needs_first_factor" && v?.strategy === "email_code" && v.status === "unverified") {
      setEmail(signIn.identifier ?? "");
      setSent(true);
    } else {
      setEmail(recallEmail());
    }
  }, [isLoaded, signIn]);

  const send = async () => {
    const res = await signIn!.create({ identifier: email.trim() });
    const factor = emailCodeFactor(res.supportedFirstFactors);
    if (!factor) throw new Error("Email codes aren't enabled for this account.");
    await signIn!.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
  };

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (!email.trim()) return setErrors({ identifier: "Enter your email address." });
    setBusy(true);
    setErrors({});
    rememberEmail(email.trim());
    try {
      await send();
      setSent(true);
    } catch (err) {
      setErrors(err instanceof Error && !("errors" in err) ? { form: err.message } : toFieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (!isLoaded || value.length < 6 || busy) return;
    setBusy(true);
    setErrors({});
    try {
      const res = await signIn.attemptFirstFactor({ strategy: "email_code", code: value });
      if (res.status === "complete") await finish(res.createdSessionId);
      else if (res.status === "needs_second_factor") go("/sign-in/factor-two");
    } catch (err) {
      setErrors({ code: firstError(err) });
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  if (!sent) {
    return (
      <>
        <BackLink onClick={() => go("/sign-in")}>Back to sign in</BackLink>
        <StepHeader kicker="Email code" title="Get a sign-in code.">
          Enter your email and we&rsquo;ll send a six-digit code. No password needed.
        </StepHeader>
        {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}
        <form onSubmit={requestCode} noValidate className="auth-rise space-y-6" style={{ ["--d" as string]: "100ms" }}>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.identifier}
            autoFocus
          />
          <PrimaryButton loading={busy}>Send me a code</PrimaryButton>
        </form>
      </>
    );
  }

  return (
    <>
      <BackLink onClick={() => go("/sign-in")}>Use a password instead</BackLink>
      <StepHeader kicker="Check your inbox" title="Enter your code.">
        We sent a six-digit code to <span className="font-medium text-ink">{email}</span>.
      </StepHeader>
      {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
        className="auth-rise space-y-7"
        style={{ ["--d" as string]: "100ms" }}
      >
        <CodeInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} error={errors.code} disabled={busy} />
        <PrimaryButton loading={busy} disabled={code.length < 6}>
          Verify and sign in
        </PrimaryButton>
        <ResendCode
          onResend={async () => {
            try {
              await send();
            } catch (err) {
              setErrors({ form: firstError(err) });
            }
          }}
        />
      </form>
    </>
  );
}

/* ---------------- /sign-in/factor-two ---------------- */

type SecondStrategy = "totp" | "phone_code" | "email_code" | "backup_code";

function SecondFactorStep({ go }: { go: (p: string) => void }) {
  const { isLoaded, signIn } = useSignIn();
  const finish = useFinishAuth();
  const [strategy, setStrategy] = useState<SecondStrategy | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const prepared = useRef(false);

  const factors = (isLoaded ? signIn.supportedSecondFactors : null) ?? [];
  const has = (s: SecondStrategy) => factors.some((f) => f.strategy === s);
  const primary: SecondStrategy | null = has("totp") ? "totp" : has("email_code") ? "email_code" : has("phone_code") ? "phone_code" : null;

  // Only on arrival: once verification completes the status changes too, and that must not
  // bounce the user back to the start while the session is being activated.
  const arrived = useRef(false);
  useEffect(() => {
    if (!isLoaded || arrived.current) return;
    arrived.current = true;
    if (signIn.status !== "needs_second_factor") go("/sign-in");
  }, [isLoaded, signIn, go]);

  useEffect(() => {
    if (!strategy && primary) setStrategy(primary);
  }, [strategy, primary]);

  const prepare = async (s: SecondStrategy) => {
    if (s === "phone_code" || s === "email_code") {
      const f = factors.find((x) => x.strategy === s);
      if (f && "phoneNumberId" in f) await signIn!.prepareSecondFactor({ strategy: "phone_code", phoneNumberId: f.phoneNumberId });
      else if (f && "emailAddressId" in f) await signIn!.prepareSecondFactor({ strategy: "email_code", emailAddressId: f.emailAddressId });
    }
  };

  useEffect(() => {
    if (!strategy || prepared.current) return;
    if (strategy === "phone_code" || strategy === "email_code") {
      prepared.current = true;
      prepare(strategy).catch((err) => setError(firstError(err)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy]);

  const verify = async (value = code) => {
    if (!isLoaded || !strategy || busy) return;
    if (strategy !== "backup_code" && value.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn.attemptSecondFactor({ strategy, code: value.trim() });
      if (res.status === "complete") await finish(res.createdSessionId);
    } catch (err) {
      setError(firstError(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const copy: Record<SecondStrategy, { title: string; body: string }> = {
    totp: { title: "Open your authenticator.", body: "Enter the six-digit code from your authenticator app." },
    email_code: { title: "One more code.", body: "We emailed you a six-digit code to finish signing in." },
    phone_code: { title: "Check your phone.", body: "We texted a six-digit code to the number on your account." },
    backup_code: { title: "Use a backup code.", body: "Enter one of the backup codes you saved when you turned on two-step verification." },
  };
  const c = strategy ? copy[strategy] : copy.totp;

  return (
    <>
      <BackLink onClick={() => go("/sign-in")}>Start over</BackLink>
      <StepHeader kicker="Two-step verification" title={c.title}>
        {c.body}
      </StepHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
        className="auth-rise space-y-7"
        style={{ ["--d" as string]: "100ms" }}
        key={strategy ?? "none"}
      >
        {strategy === "backup_code" ? (
          <TextField
            label="Backup code"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error}
            autoFocus
          />
        ) : (
          <CodeInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} error={error} disabled={busy} />
        )}
        <PrimaryButton loading={busy} disabled={strategy !== "backup_code" && code.length < 6}>
          Verify
        </PrimaryButton>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {strategy === "email_code" || strategy === "phone_code" ? (
            <ResendCode
              onResend={async () => {
                try {
                  await prepare(strategy);
                } catch (err) {
                  setError(firstError(err));
                }
              }}
            />
          ) : (
            <span />
          )}
          {has("backup_code") ? (
            <TextButton
              onClick={() => {
                setCode("");
                setError(null);
                setStrategy(strategy === "backup_code" ? primary : "backup_code");
              }}
            >
              {strategy === "backup_code" ? "Use a code instead" : "Use a backup code"}
            </TextButton>
          ) : null}
        </div>
      </form>
    </>
  );
}

/* ---------------- /sign-in/forgot-password ---------------- */

function ForgotPasswordStep({ go }: { go: (p: string) => void }) {
  const { isLoaded, signIn } = useSignIn();
  const finish = useFinishAuth();
  const [phase, setPhase] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => setEmail((e) => e || recallEmail()), []);

  const send = async () => {
    await signIn!.create({ strategy: "reset_password_email_code", identifier: email.trim() });
  };

  const request = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (!email.trim()) return setErrors({ identifier: "Enter the email on your account." });
    setBusy(true);
    setErrors({});
    rememberEmail(email.trim());
    try {
      await send();
      setPhase("reset");
    } catch (err) {
      setErrors(toFieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (code.length < 6) return setErrors({ code: "Enter the six-digit code from the email." });
    if (password.length < 8) return setErrors({ password: "Use at least 8 characters." });
    setBusy(true);
    setErrors({});
    try {
      const res = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code, password });
      if (res.status === "complete") await finish(res.createdSessionId);
      else if (res.status === "needs_second_factor") go("/sign-in/factor-two");
      else if (res.status === "needs_new_password") {
        const done = await signIn.resetPassword({ password, signOutOfOtherSessions: true });
        if (done.status === "complete") await finish(done.createdSessionId);
      }
    } catch (err) {
      const fe = toFieldErrors(err);
      setErrors(fe);
      if (fe.code) setCode("");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "request") {
    return (
      <>
        <BackLink onClick={() => go("/sign-in")}>Back to sign in</BackLink>
        <StepHeader kicker="Forgot password" title="Let’s get you back in.">
          Enter the email on your account and we&rsquo;ll send a code to reset your password.
        </StepHeader>
        {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}
        <form onSubmit={request} noValidate className="auth-rise space-y-6" style={{ ["--d" as string]: "100ms" }}>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.identifier}
            autoFocus
          />
          <PrimaryButton loading={busy}>Send reset code</PrimaryButton>
        </form>
      </>
    );
  }

  return (
    <>
      <BackLink onClick={() => setPhase("request")}>Use a different email</BackLink>
      <StepHeader kicker="Reset password" title="Choose a new password.">
        Enter the code we sent to <span className="font-medium text-ink">{email}</span>, then pick a new password.
      </StepHeader>
      {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}
      <form onSubmit={reset} noValidate className="auth-rise space-y-6" style={{ ["--d" as string]: "100ms" }}>
        <CodeInput value={code} onChange={setCode} error={errors.code} disabled={busy} />
        <div>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <PasswordStrength value={password} />
        </div>
        <PrimaryButton loading={busy}>Reset password and sign in</PrimaryButton>
        <ResendCode
          onResend={async () => {
            try {
              await send();
            } catch (err) {
              setErrors({ form: firstError(err) });
            }
          }}
        />
      </form>
    </>
  );
}
