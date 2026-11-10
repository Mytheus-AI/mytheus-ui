"use client";

import { useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Button, LinkButton } from "./Button";

/* A failed read, drawn apart from an empty one: the brand's line runs in and frays at its end
   (empty states draw something whole). It says what could not be loaded, that nothing was lost,
   and offers a real Retry: `onRetry` when given (an error boundary's `reset`), otherwise
   `router.refresh()`, which re-runs this route's server reads without a full reload.

   Three sizes: `inline` inside a card (the card is already the box), `panel` as a box of its own,
   `page` for a whole route's error boundary. */

export function FrayedLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 64" aria-hidden className={`mx-draw line-stroke ${className}`}>
      <path pathLength={1} d="M4 34 C20 34 30 34 46 34 C56 34 62 30 70 32" />
      <path pathLength={1} d="M70 32 C78 34 82 24 92 20" style={{ ["--dl" as string]: "0.7s" }} />
      <path pathLength={1} d="M70 32 C80 32 86 36 98 34" style={{ ["--dl" as string]: "0.75s" }} />
      <path pathLength={1} d="M70 32 C78 36 82 46 90 50" style={{ ["--dl" as string]: "0.8s" }} />
    </svg>
  );
}

export function RetryButton({ onRetry, label = "Retry", size = "sm" }: { onRetry?: () => void; label?: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={size === "md" ? "primary" : "outline"}
      size={size}
      disabled={pending}
      aria-busy={pending}
      onClick={() => (onRetry ? onRetry() : startTransition(() => router.refresh()))}
    >
      <ArrowClockwise size={size === "md" ? 16 : 14} weight="bold" aria-hidden className={pending ? "motion-safe:animate-spin" : ""} />
      {pending ? "Retrying" : label}
    </Button>
  );
}

export function ErrorState({
  title,
  text = "Nothing was lost. This is usually a passing problem reaching the workspace.",
  onRetry,
  variant = "panel",
  action,
  digest,
  className = "",
}: {
  title: string;
  text?: ReactNode;
  /** what Retry does; defaults to re-running this route's server reads */
  onRetry?: () => void;
  variant?: "inline" | "panel" | "page";
  /** a second, quiet way out ("Go to Home") */
  action?: ReactNode;
  /** an error boundary's digest, shown as a reference for support */
  digest?: string;
  className?: string;
}) {
  if (variant === "inline") {
    return (
      <div role="alert" className={`flex items-start gap-4 px-4 pb-[18px] pt-1 sm:px-[22px] ${className}`}>
        <FrayedLine className="mt-0.5 h-8 w-[60px] shrink-0" />
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <p className="mb-3.5 mt-1 max-w-[52ch] text-[14px] text-ink-3">{text}</p>
          <div className="flex flex-wrap gap-2">
            <RetryButton onRetry={onRetry} />
            {action}
          </div>
        </div>
      </div>
    );
  }
  const page = variant === "page";
  return (
    <div
      role="alert"
      className={`flex flex-col items-center rounded-card border border-line bg-surface text-center shadow-warm-1 ${
        page ? "px-6 py-16" : "px-6 py-12"
      } ${className}`}
    >
      <FrayedLine className={page ? "h-16 w-[120px]" : "h-12 w-[90px]"} />
      <h2 className="display mt-4 text-[22px] text-ink-display">{title}</h2>
      <p className="mt-2 max-w-[48ch] text-[15px] text-ink-3">{text}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <RetryButton onRetry={onRetry} size={page ? "md" : "sm"} label={page ? "Try again" : "Retry"} />
        {action}
      </div>
      {digest ? <p className="mt-4 text-[12.5px] text-ink-3">Reference {digest}</p> : null}
    </div>
  );
}

/** The body of an app route's `error.tsx`: the page's own title stays, so the screen still says
    where you are, then the page-sized error with Retry and a way home. */
export function RouteErrorState({
  error,
  reset,
  page,
  title,
  text,
  backHref = "/dashboard",
  backLabel = "Go to Home",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  page: string;
  title: string;
  text?: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto w-full max-w-[1320px]">
      <h1 className="display pb-6 pt-2 text-[clamp(28px,3vw,34px)] text-ink-display sm:pb-7">{page}</h1>
      <ErrorState
        variant="page"
        title={title}
        text={text}
        onRetry={reset}
        digest={error.digest}
        action={
          <LinkButton href={backHref} variant="outline" size="md">
            {backLabel}
          </LinkButton>
        }
      />
    </div>
  );
}
