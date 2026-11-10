"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/client";
import { putDigestPreferences } from "@/lib/api/digests";
import type { DigestPreferences } from "@/lib/api/only-mytheus-types";

/* The weekly digest preference (only-Mytheus wave, contract section 5): the in-app digest on or
   off, and a copy by email. The caller's own; nothing about the user is taken from the input. */

export type DigestPrefsResult = { ok: true; prefs: DigestPreferences } | { ok: false; message: string };

export async function saveDigestPreferences(input: DigestPreferences): Promise<DigestPrefsResult> {
  const weekly = Boolean(input?.weekly_enabled);
  // Email is a copy of the weekly digest: with the digest off there is nothing to send.
  const prefs: DigestPreferences = { weekly_enabled: weekly, email_enabled: weekly && Boolean(input?.email_enabled) };
  try {
    const saved = await putDigestPreferences(prefs);
    revalidatePath("/settings/notifications");
    return {
      ok: true,
      prefs: {
        weekly_enabled: typeof saved?.weekly_enabled === "boolean" ? saved.weekly_enabled : prefs.weekly_enabled,
        email_enabled: typeof saved?.email_enabled === "boolean" ? saved.email_enabled : prefs.email_enabled,
      },
    };
  } catch (err) {
    if (err instanceof ApiError && err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    return { ok: false, message: "Your digest settings couldn't be saved just now. Try again in a moment." };
  }
}
