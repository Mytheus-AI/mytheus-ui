"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

/** Where a signed-in user lands when nothing else asked for a destination. */
export const AFTER_AUTH_URL = "/dashboard";

/**
 * Pages for Clerk's session tasks. A session that still owes a task is "pending": it is
 * signed in but not yet allowed into the app, so the middleware lets these pages through.
 */
export const TASK_URLS = {
  "choose-organization": "/onboarding/organization",
} as const;

export type FieldErrors = Partial<Record<"identifier" | "email" | "password" | "code" | "firstName" | "lastName" | "name" | "form", string>>;

const PARAM_TO_FIELD: Record<string, keyof FieldErrors> = {
  identifier: "identifier",
  email_address: "email",
  password: "password",
  code: "code",
  first_name: "firstName",
  last_name: "lastName",
  name: "name",
};

/** Turn a Clerk error into per-field messages, falling back to one form-level message. */
export function toFieldErrors(err: unknown): FieldErrors {
  if (isClerkAPIResponseError(err)) {
    const out: FieldErrors = {};
    for (const e of err.errors) {
      const param: string | undefined = e.meta?.paramName;
      const field: keyof FieldErrors = (param && PARAM_TO_FIELD[param]) || "form";
      if (!out[field]) out[field] = friendly(e.code, e.longMessage || e.message);
    }
    return out;
  }
  return { form: "Something went wrong on our side. Please try again." };
}

export function firstError(err: unknown): string {
  const e = toFieldErrors(err);
  return Object.values(e)[0] ?? "Something went wrong. Please try again.";
}

/** Rewrites for the handful of Clerk messages users actually hit, in the product's voice. */
function friendly(code: string, fallback: string): string {
  switch (code) {
    case "form_password_incorrect":
      return "That password doesn't match this account.";
    case "form_param_format_invalid":
    case "form_identifier_invalid":
      return "That doesn't look like a valid email address.";
    case "form_identifier_not_found":
      return "We couldn't find an account with that email.";
    case "form_code_incorrect":
      return "That code isn't right. Check the latest email and try again.";
    case "verification_expired":
      return "That code has expired. Send a new one below.";
    case "form_identifier_exists":
      return "An account with this email already exists. Sign in instead.";
    case "form_password_pwned":
      return "This password has appeared in a data breach. Please choose a different one.";
    case "strategy_for_user_invalid":
      return "This account doesn't use a password. Continue with Google, or get an email code.";
    case "too_many_requests":
      return "Too many attempts. Wait a moment, then try again.";
    case "session_exists":
      return "You're already signed in.";
    default:
      return fallback;
  }
}

/**
 * The validated post-auth destination. Clerk's middleware appends `redirect_url` as a full
 * URL; only a same-origin target is honoured so this page can never bounce someone off-site.
 */
export function useRedirectTarget(): string {
  const params = useSearchParams();
  const raw = params.get("redirect_url");
  if (!raw || typeof window === "undefined") return AFTER_AUTH_URL;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return AFTER_AUTH_URL;
    if (url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/sign-up")) return AFTER_AUTH_URL;
    return url.pathname + url.search + url.hash;
  } catch {
    return AFTER_AUTH_URL;
  }
}

/**
 * Activate a freshly created session, then route: an outstanding session task (such as
 * choosing an organization) comes first, otherwise the redirect target.
 */
export function useFinishAuth() {
  const { setActive } = useClerk();
  const router = useRouter();
  const target = useRedirectTarget();

  return useCallback(
    async (sessionId: string | null) => {
      if (!sessionId) return;
      await setActive({
        session: sessionId,
        navigate: async ({ session }) => {
          const task = session?.currentTask?.key as keyof typeof TASK_URLS | undefined;
          if (task && TASK_URLS[task]) {
            router.push(TASK_URLS[task]);
            return;
          }
          router.push(target);
        },
      });
    },
    [setActive, router, target],
  );
}
