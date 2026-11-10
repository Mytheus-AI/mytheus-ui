"use server";

/**
 * `createCaptureLink`: the /capture/connect page's one write. Mints the link token the Mytheus
 * Capture extension keeps, for the signed-in user's current Clerk session, and returns it to the
 * page, which hands it to the extension with `chrome.runtime.sendMessage` (only the allowlisted
 * extension id, only from this origin: the extension's `externally_connectable`).
 *
 * The token names the Clerk session, so signing out of Mytheus revokes it; it never carries a
 * Clerk token, an org id or any secret.
 */

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

import { captureConfig, captureConfigured } from "@/app/api/capture/_lib/config";
import { signLinkToken } from "@/app/api/capture/_lib/tokens";

export type CaptureLinkResult =
  | {
      ok: true;
      token: string;
      expiresAt: number;
      account: { name: string; email: string; organization: string };
    }
  | { ok: false; code: "AUTH_REQUIRED" | "CAPTURE_NOT_CONFIGURED" | "EXTENSION_NOT_ALLOWED" };

export async function createCaptureLink(extensionId: string): Promise<CaptureLinkResult> {
  const config = captureConfig();
  if (!captureConfigured(config)) return { ok: false, code: "CAPTURE_NOT_CONFIGURED" };
  if (!config.extensionIds.includes(extensionId)) return { ok: false, code: "EXTENSION_NOT_ALLOWED" };

  const { sessionId, userId, orgId } = await auth();
  if (!sessionId || !userId) return { ok: false, code: "AUTH_REQUIRED" };

  const user = await currentUser();
  let organization = "";
  if (orgId) {
    try {
      organization = (await (await clerkClient()).organizations.getOrganization({ organizationId: orgId })).name;
    } catch {
      organization = "";
    }
  }
  const { token, expiresAt } = signLinkToken({ sessionId, clerkUserId: userId, extensionId }, config.secret);
  return {
    ok: true,
    token,
    expiresAt,
    account: {
      name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "",
      email: user?.primaryEmailAddress?.emailAddress ?? "",
      organization: organization || "Your workspace",
    },
  };
}
