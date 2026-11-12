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
import { ArrowLeft, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/* ================================================================== */
/*  Auth form atoms. They compose the shared `Input` and `Button` and  */
/*  hold no Clerk logic, so the flows stay readable and these stay     */
/*  dumb. Errors are announced (role="alert") and tied to their field  */
/*  with aria-describedby.                                             */
/* ================================================================== */

/* ---------------- headings ---------------- */

export function StepHeader({
  kicker,
  title,
  children,
}: {
  /** an optional sentence-case label above the title, for steps inside a flow */
  kicker?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-7">
      {kicker ? <p className="kicker mb-2">{kicker}</p> : null}
      <h1 className="display text-[clamp(1.875rem,3.2vw,2.375rem)]">{title}</h1>
      {children ? (
        <p className="mt-3 max-w-[44ch] text-pretty text-[15.5px] leading-relaxed text-ink-3">{children}</p>
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

/** The shared `Input` (label above, 12px corners, coral focus ring) plus an announced error. */
export function TextField({ label, error, hint, trailing, className = "", id, ...rest }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const msgId = `${fieldId}-msg`;
  return (
    <div className={className}>
      <div className="relative">
        <Input
          id={fieldId}
          label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className={`auth-input ${error ? "!border-priority-high" : ""} ${trailing ? "pr-12" : ""}`}
          {...rest}
        />
        {trailing ? <div className="absolute bottom-0.5 right-0.5">{trailing}</div> : null}
      </div>
      {error ? (
        <p id={msgId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-priority-high">
          <WarningCircle size={15} weight="bold" className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <div id={msgId} className="mt-1.5 text-[13px] text-ink-3">
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
          className="flex h-10 w-10 items-center justify-center rounded-ctl text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {shown ? <EyeSlash size={19} aria-hidden /> : <Eye size={19} aria-hidden />}
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
    <div className="mt-2.5 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i < score ? (score >= 3 ? "bg-ok" : "bg-signal-line") : "bg-bg-2"
            }`}
          />
        ))}
      </div>
      <span className="min-w-[88px] text-right text-[13px] text-ink-3">
        <span className="sr-only">Password strength: </span>
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
  const msgId = `${useId()}-msg`;

  return (
    <div>
      <div className="relative" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? msgId : undefined}
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
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 focus-visible:outline-none disabled:cursor-not-allowed"
        />
        <div
          className={`grid gap-2 transition-opacity duration-150 sm:gap-2.5 ${disabled ? "opacity-60" : ""}`}
          style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {Array.from({ length }).map((_, i) => {
            const char = value[i] ?? "";
            const isActive = focused && i === active;
            return (
              <span
                key={i}
                className={`relative flex h-14 items-center justify-center rounded-ctl border bg-surface text-[22px] font-semibold tabular-nums text-ink transition-[border-color,box-shadow] duration-150 sm:h-[60px] ${
                  error
                    ? "border-priority-high"
                    : isActive
                      ? "border-signal shadow-[0_0_0_4px_var(--signal-soft)]"
                      : char
                        ? "border-ink-4"
                        : "border-line-2"
                }`}
              >
                {char}
                {isActive && !char ? <span className="auth-caret absolute h-6 w-[2px] rounded-full bg-signal" /> : null}
              </span>
            );
          })}
        </div>
      </div>
      {error ? (
        <p id={msgId} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug text-priority-high">
          <WarningCircle size={15} weight="bold" className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------- buttons ---------------- */

/** The page's one dark primary, full width. Shows a spinner while its request is in flight. */
export function PrimaryButton({
  children,
  loading,
  disabled,
  className = "",
  type = "submit",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <Button
      type={type}
      variant="primary"
      size="lg"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`w-full !text-[16px] ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      <span>{children}</span>
    </Button>
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
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className="w-full gap-3 !text-[16px]"
    >
      {loading ? <Spinner className="text-ink-3" /> : <GoogleGlyph />}
      {children}
    </Button>
  );
}

/** An inline text action: ink text with the coral underline. */
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
      className={`rounded-[4px] text-[14px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] transition-colors hover:decoration-signal disabled:cursor-not-allowed disabled:text-ink-3 disabled:no-underline ${className}`}
    >
      {children}
    </button>
  );
}

export function BackLink({ onClick, href, children = "Back" }: { onClick?: () => void; href?: string; children?: ReactNode }) {
  const cls =
    "-ml-2 mb-6 inline-flex h-10 items-center gap-2 rounded-ctl px-2 text-[14px] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink";
  const inner = (
    <>
      <ArrowLeft size={16} aria-hidden />
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
    <div className="my-6 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[13px] text-ink-3">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function FormAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-6 flex items-start gap-2.5 rounded-ctl px-4 py-3 text-[14px] leading-relaxed ${
        tone === "error" ? "bg-priority-high-soft text-priority-high" : "bg-signal-soft text-signal-ink"
      }`}
    >
      <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
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
        <span className="tabular-nums text-ink-3">Send again in 0:{String(left).padStart(2, "0")}</span>
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
          {busy ? "Sending" : "Send a new code"}
        </TextButton>
      )}
    </p>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`auth-spin h-[18px] w-[18px] shrink-0 ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.4" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Google's mark in its own brand colours (a third-party logo, not a theme colour). */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px] shrink-0" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}
