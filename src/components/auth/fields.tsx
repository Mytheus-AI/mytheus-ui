"use client";

import Link from "next/link";
import {
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowRight } from "@/components/landing/ui";

/* ================================================================== */
/*  Auth form atoms. Token-styled and reduced-motion safe. They hold   */
/*  no Clerk logic, so the flows stay readable and these stay dumb.    */
/* ================================================================== */

/* ---------------- headings ---------------- */

export function StepHeader({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="auth-rise mb-8">
      <p className="kicker mb-3.5 flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden>
          <path d="M12 2.5l2.3 6.4 6.7.3-5.3 4.2 1.9 6.6L12 16.2 6.4 20l1.9-6.6L3 9.2l6.7-.3z" fill="var(--signal)" stroke="var(--doodle-ink, #2a2620)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        {kicker}
      </p>
      <h1 className="display text-balance text-[clamp(2.2rem,3.6vw,3rem)] text-ink-display">{title}</h1>
      {children ? (
        <p className="mt-3.5 max-w-[42ch] text-pretty text-[15px] leading-relaxed text-ink-3">
          {children}
        </p>
      ) : null}
    </header>
  );
}

/* ---------------- text fields ---------------- */

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  /** message under the field; turns the field red */
  error?: string | null;
  /** quiet helper text under the field when there is no error */
  hint?: ReactNode;
  /** trailing element inside the field (show-password toggle, etc.) */
  trailing?: ReactNode;
};

/**
 * Floating-label field. The label sits inside the field like a placeholder and moves to the
 * top of the field once it has a value (driven by `:placeholder-shown`, so autofill moves it
 * too without any JS). Focusing an empty field changes nothing but a slightly darker border.
 */
export function TextField({ label, error, hint, trailing, className = "", id, ...rest }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const msgId = `${fieldId}-msg`;
  return (
    <div className={className}>
      <div className="relative">
        <input
          id={fieldId}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className={`auth-input peer block h-[58px] w-full rounded-[16px] border-[1.5px] bg-surface px-[18px] pb-2 pt-6 text-[15.5px] text-ink !outline-none transition-[border-color] duration-200 ${
            error ? "border-priority-high" : "border-line-2 hover:border-ink-3 focus:border-ink-3"
          } ${trailing ? "pr-14" : ""}`}
          {...rest}
        />
        <label
          htmlFor={fieldId}
          className="pointer-events-none absolute left-[18px] top-[9px] origin-left scale-[0.8] text-[15px] leading-none text-ink-3 transition-[top,transform] duration-200 [transition-timing-function:var(--ease-soft)] peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100"
        >
          {label}
        </label>
        {trailing ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
        ) : null}
      </div>
      {error ? (
        <p id={msgId} role="alert" className="auth-rise mt-2 pl-1 text-[13px] text-priority-high">
          {error}
        </p>
      ) : hint ? (
        <div id={msgId} className="mt-2 pl-1 text-[13px] text-ink-3">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
        >
          {shown ? <EyeOff /> : <Eye />}
        </button>
      }
    />
  );
}

/** A quiet four-step strength meter. Guidance only: Clerk is the real judge. */
export function PasswordStrength({ value }: { value: string }) {
  const score =
    (value.length >= 8 ? 1 : 0) +
    (value.length >= 12 ? 1 : 0) +
    (/[A-Z]/.test(value) && /[a-z]/.test(value) ? 1 : 0) +
    (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value) ? 1 : 0);
  const words = ["Too short", "Getting there", "Decent", "Strong", "Excellent"];
  if (!value) return null;
  return (
    <div className="mt-3 flex items-center gap-3 pl-1" aria-live="polite">
      <div className="flex flex-1 gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
              i < score ? (score >= 3 ? "bg-signal" : "bg-signal-bright") : "bg-line"
            }`}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        {words[score]}
      </span>
    </div>
  );
}

/* ---------------- one-time code ---------------- */

/**
 * Six boxes driven by ONE real input laid over them, so paste, SMS/email autofill
 * (`autocomplete="one-time-code"`) and backspace all behave natively.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  error,
  disabled,
  autoFocus = true,
  label = "Verification code",
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);

  return (
    <div>
      <div className="relative" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, length);
            onChange(next);
            if (next.length === length) onComplete?.(next);
          }}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div className="grid gap-2 sm:gap-2.5" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }} aria-hidden>
          {Array.from({ length }).map((_, i) => {
            const char = value[i] ?? "";
            const isActive = focused && i === active && value.length < length + 1;
            return (
              <span
                key={i}
                className={`relative flex aspect-[4/5] max-h-[68px] items-center justify-center rounded-[16px] border-[1.5px] bg-surface font-mono text-[clamp(1.25rem,3vw,1.6rem)] text-ink transition-[border-color] duration-200 ${
                  error
                    ? "border-priority-high"
                    : isActive
                      ? "border-ink-3"
                      : char
                        ? "border-ink-3"
                        : "border-line-2"
                } ${char ? "auth-pop" : ""}`}
              >
                {char}
                {isActive && !char ? <span className="auth-caret absolute h-7 w-[2px] rounded-full bg-signal" /> : null}
              </span>
            );
          })}
        </div>
      </div>
      {error ? (
        <p role="alert" className="auth-rise mt-3 pl-1 text-[13px] text-priority-high">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------- buttons ---------------- */

export function PrimaryButton({
  children,
  loading,
  disabled,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`group relative inline-flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-[var(--doodle-ink,#2a2620)] bg-[var(--doodle-ink,#2a2620)] text-[15.5px] font-semibold tracking-tight text-[#fffaf0] transition-opacity duration-150 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          <span>Working&hellip;</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}

export function GoogleButton({
  onClick,
  loading,
  disabled,
  children = "Continue with Google",
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="group inline-flex h-[56px] w-full items-center justify-center gap-3 rounded-full border-[1.5px] border-line-2 bg-surface text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-ink-3 hover:bg-bg-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Spinner className="text-ink-3" /> : <GoogleGlyph />}
      {children}
    </button>
  );
}

export function TextButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`link-underline text-[14px] font-medium text-ink-2 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-3 ${className}`}
    >
      {children}
    </button>
  );
}

export function BackLink({ onClick, href, children = "Back" }: { onClick?: () => void; href?: string; children?: ReactNode }) {
  const cls =
    "auth-rise group mb-8 inline-flex items-center gap-2 rounded-pill py-1.5 pr-3 text-[13.5px] font-medium text-ink-3 transition-colors hover:text-ink";
  const inner = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-line-2 bg-surface transition-transform duration-300 group-hover:-translate-x-0.5">
        <ArrowRight className="h-4 w-4 rotate-180" />
      </span>
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/* ---------------- misc ---------------- */

export function OrDivider({ children = "or" }: { children?: ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-4" role="separator">
      <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-line-2" />
      <span className="font-hand text-[19px] font-medium text-ink-3">{children}</span>
      <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-line-2" />
    </div>
  );
}

export function FormAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`auth-rise mb-6 flex gap-3 rounded-2xl border px-4 py-3.5 text-[14px] leading-relaxed ${
        tone === "error"
          ? "border-priority-high-soft bg-priority-high-soft text-priority-high"
          : "border-signal-soft bg-signal-soft text-signal-deep"
      }`}
    >
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** "Resend code" with a cooldown, so a double click cannot spam the inbox. */
export function ResendCode({ onResend, seconds = 30 }: { onResend: () => Promise<void>; seconds?: number }) {
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setLeft(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, l - 1);
      });
    }, 1000);
  };

  return (
    <p className="text-[14px] text-ink-3">
      Didn&rsquo;t get it?{" "}
      {left > 0 ? (
        <span className="font-mono text-[13px] tabular-nums text-ink-3">Resend in 0:{String(left).padStart(2, "0")}</span>
      ) : (
        <TextButton
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onResend();
              start();
            } finally {
              setBusy(false);
            }
          }}
        >
          Send a new code
        </TextButton>
      )}
    </p>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`auth-spin h-[18px] w-[18px] ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.4" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function Eye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]" aria-hidden>
      <path d="M4 4l16 16M10.6 6.1c.5-.1.9-.1 1.4-.1 6 0 9.5 6 9.5 6s-1 1.8-2.9 3.5M6.6 7.6C4 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-1M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Google's mark in its own brand colours (a third-party logo, not a theme colour). */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}
