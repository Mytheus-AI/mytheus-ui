"use server";

import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { api, ApiError } from "@/lib/api/client";
import { orgTag } from "@/lib/api/org-context";

export type ProvisionOutcome = { ok: true } | { ok: false; reason: "not_admin" | "unavailable" };

/**
 * Make sure the caller's ACTIVE Clerk organization has a Mytheus tenant behind it.
 *
 * `POST /orgs/self-serve` creates it the first time (the caller must be that org's Clerk admin,
 * which the backend checks with Clerk itself) and returns the existing one every time after, so
 * onboarding calls this unconditionally, whether the visitor created a workspace or joined one.
 * Without it a new workspace exists in Clerk only, and every API call is refused with "Token
 * carries no usable organization". The org and user come from the session token; nothing is
 * taken from the request.
 */
export async function provisionActiveWorkspace(): Promise<ProvisionOutcome> {
  try {
    await api("/orgs/self-serve", { method: "POST" });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { ok: false, reason: "not_admin" };
    return { ok: false, reason: "unavailable" };
  }
}

export type RenameOutcome = { ok: true; name: string } | { ok: false; message: string };

/**
 * Rename the caller's active workspace. The name lives on the Clerk organization (the sidebar
 * and every screen read it from there, cached under `orgTag`), so this updates Clerk and drops
 * that cache entry. Only a Clerk org admin may rename; the org comes from the verified session,
 * never from the input.
 */
export async function renameWorkspace(rawName: string): Promise<RenameOutcome> {
  const name = rawName.trim();
  if (!name) return { ok: false, message: "The name cannot be empty." };
  if (name.length > 100) return { ok: false, message: "Keep the name under 100 characters." };
  const { orgId, orgRole } = await auth();
  if (!orgId) return { ok: false, message: "You are not in a workspace." };
  if (orgRole !== "org:admin") return { ok: false, message: "Only workspace admins can rename it." };
  try {
    await (await clerkClient()).organizations.updateOrganization(orgId, { name });
  } catch {
    return { ok: false, message: "The name could not be saved just now. Try again in a moment." };
  }
  revalidateTag(orgTag(orgId));
  return { ok: true, name };
}
