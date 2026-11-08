"use server";

import { headers } from "next/headers";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type InviteRole = "org:member" | "org:admin";
export type WorkspaceInviteResult = { sent: string[]; failed: { email: string; message: string }[] };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The app host this request came in on, for the invitation link to point back at. */
function appOrigin(): string {
  const h = headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  return host ? `${proto}://${host}` : "";
}

/**
 * Invite people to the ACTIVE workspace by email. Clerk sends each one an invitation whose link
 * opens the workspace chooser here (`?switch=1`), where they accept it; accepting makes them a
 * member of this workspace's tenant too.
 *
 * Authorization comes from the verified session, never the request: only a Clerk `org:admin`
 * of the active organization may invite. (This uses Clerk's Backend API, which would otherwise
 * accept an invitation from anyone holding the secret key, i.e. this server.)
 */
export async function inviteToWorkspace(emails: string[], role: InviteRole): Promise<WorkspaceInviteResult> {
  const { orgId, orgRole, userId } = await auth();
  const clean = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))).slice(0, 20);
  if (!orgId || !userId) {
    return { sent: [], failed: clean.map((email) => ({ email, message: "Sign in to a workspace first." })) };
  }
  if (orgRole !== "org:admin") {
    return { sent: [], failed: clean.map((email) => ({ email, message: "Only workspace admins can invite people." })) };
  }

  const origin = appOrigin();
  const redirectUrl = origin ? `${origin}/onboarding/organization?switch=1` : undefined;
  const client = await clerkClient();
  const result: WorkspaceInviteResult = { sent: [], failed: [] };
  for (const email of clean) {
    if (!EMAIL.test(email)) {
      result.failed.push({ email, message: "Not an email address." });
      continue;
    }
    try {
      await client.organizations.createOrganizationInvitation({
        organizationId: orgId,
        inviterUserId: userId,
        emailAddress: email,
        role: role === "org:admin" ? "org:admin" : "org:member",
        redirectUrl,
      });
      result.sent.push(email);
    } catch (err) {
      const message =
        (err as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0]?.longMessage ??
        (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
        "Clerk could not send this invitation.";
      result.failed.push({ email, message });
    }
  }
  return result;
}
