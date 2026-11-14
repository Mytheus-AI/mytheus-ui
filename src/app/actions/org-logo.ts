"use server";

import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { orgTag } from "@/lib/api/org-context";
import { deleteOrgLogo, putOrgLogo, type LogoWrite } from "@/lib/api/org-logo";
import { LOGO_MAX_BYTES } from "@/lib/org-logo";

export type LogoOutcome = { ok: true; logoUrl: string | null } | { ok: false; message: string };

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** A message a person can act on, from the API's refusal. */
function messageFor(res: Extract<LogoWrite, { ok: false }>): string {
  switch (res.reason) {
    case "too_large":
      return "That image is over 2 MB. Choose a smaller one.";
    case "unsupported_type":
    case "svg_not_accepted":
      return "That file is not an image we can use. Choose a PNG, JPEG, WebP or SVG.";
    case "bad_dimensions":
      return "That image is too small or too large. Use one between 16 and 4096 pixels wide.";
    case "corrupt_image":
      return "That image could not be read. Try exporting it again.";
    case "storage_not_configured":
      return "Logo storage is not connected on this server yet, so logos cannot be saved.";
  }
  if (res.status === 403) return "Only workspace admins can change the logo.";
  if (res.status === 429) return "The logo has been changed too many times this hour. Try again later.";
  return "The logo could not be saved just now. Try again in a moment.";
}

/**
 * Save the workspace logo. The editor has already cropped it to a square and exported it at
 * 512 px, so `file` is a PNG, JPEG or WebP. Stored in R2 by identity-tenant-service (the source of
 * truth), then mirrored to the Clerk organization's image, best effort, so Clerk's own screens
 * and the workspace chooser match. Only a Clerk org admin may try; the API enforces its own tier.
 */
export async function uploadOrgLogo(form: FormData): Promise<LogoOutcome> {
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, message: "Choose an image first." };
  if (file.size > LOGO_MAX_BYTES) return { ok: false, message: "That image is over 2 MB. Choose a smaller one." };
  if (!TYPES.has(file.type)) return { ok: false, message: "That file is not an image we can use. Choose a PNG, JPEG, WebP or SVG." };
  const { orgId, orgRole, userId } = await auth();
  if (!orgId) return { ok: false, message: "You are not in a workspace." };
  if (orgRole !== "org:admin") return { ok: false, message: "Only workspace admins can change the logo." };

  const bytes = await file.arrayBuffer();
  const res = await putOrgLogo(bytes, file.type);
  if (!res.ok) return { ok: false, message: messageFor(res) };

  try {
    await (await clerkClient()).organizations.updateOrganizationLogo(orgId, {
      file: new Blob([bytes], { type: file.type }),
      uploaderUserId: userId ?? undefined,
    });
  } catch {
    // The mirror is cosmetic: Mytheus draws the logo from R2. Clerk catches up on the next save.
  }
  revalidateTag(orgTag(orgId));
  return { ok: true, logoUrl: res.logo?.logo_url ?? null };
}

/** Remove the workspace logo (from R2, then from the Clerk organization, best effort). */
export async function removeOrgLogo(): Promise<LogoOutcome> {
  const { orgId, orgRole } = await auth();
  if (!orgId) return { ok: false, message: "You are not in a workspace." };
  if (orgRole !== "org:admin") return { ok: false, message: "Only workspace admins can change the logo." };
  const res = await deleteOrgLogo();
  if (!res.ok) return { ok: false, message: res.status === 403 ? "Only workspace admins can change the logo." : "The logo could not be removed just now. Try again in a moment." };
  try {
    await (await clerkClient()).organizations.deleteOrganizationLogo(orgId);
  } catch {
    // No Clerk image, or Clerk unreachable: nothing Mytheus shows depends on it.
  }
  revalidateTag(orgTag(orgId));
  return { ok: true, logoUrl: null };
}
