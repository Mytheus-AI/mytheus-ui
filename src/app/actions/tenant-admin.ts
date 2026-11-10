"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  createSupportGrant,
  patchTenantSettings,
  removeMember,
  requestDataExport,
  revokeSupportGrant,
  setMemberTier,
} from "@/lib/api/admin-tenant";
import {
  CONFIDENCE_AGENTS,
  isGrantDuration,
  isGrantScope,
  isTier,
  isUuid,
  parseSettingsForm,
  type SettingsFormInput,
} from "@/lib/tenant-admin";

/* Writes for the tenant-admin console (Phase P12, plan 3.13 and 3.14) over admin-ops-service's
   `/admin/tenant/*`. Owner and admin only: the server enforces the tier and writes the audit row
   for every call. Nothing about the tenant is taken from the input; ids in the form are only
   ever a member, a grant or a staff user inside the caller's own tenant, and the server answers
   404 for anything else.

   Each action has the `useFormState` shape, so the forms post without client JS and still show
   the server's answer. */

export type FormResult = { ok: true; message: string } | { ok: false; message: string } | null;

function failure(err: unknown, fallback: string): FormResult {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 403) return { ok: false, message: "Only workspace owners and admins can do this." };
    if (err.status === 404) return { ok: false, message: "That is no longer here. Refresh to see the current list." };
    if (err.status === 409 || err.status === 422) {
      // The server's own reason (last owner, not a staff id, ...) is the useful one here.
      return { ok: false, message: err.message && !/^HTTP \d+$/.test(err.message) ? err.message : fallback };
    }
  }
  return { ok: false, message: fallback };
}

export async function changeMemberTier(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const userId = formData.get("user_id");
  const tier = formData.get("tier");
  if (!isUuid(userId) || !isTier(tier)) return { ok: false, message: "Pick a valid access level." };
  try {
    await setMemberTier(userId, tier);
  } catch (err) {
    return failure(err, "The access level could not be changed just now. Try again in a moment.");
  }
  revalidatePath("/tenant/members");
  return { ok: true, message: "Access updated." };
}

export async function removeMemberAccess(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const userId = formData.get("user_id");
  if (!isUuid(userId)) return { ok: false, message: "That member is not valid." };
  try {
    await removeMember(userId);
  } catch (err) {
    return failure(err, "Access could not be removed just now. Try again in a moment.");
  }
  revalidatePath("/tenant/members");
  return { ok: true, message: "Access removed." };
}

export async function saveTenantSettings(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const thresholds: SettingsFormInput["thresholds"] = {};
  for (const { key } of CONFIDENCE_AGENTS) {
    thresholds[key] = {
      surface: String(formData.get(`surface_${key}`) ?? ""),
      silent: String(formData.get(`silent_${key}`) ?? ""),
    };
  }
  const parsed = parseSettingsForm({
    retention_days_transcripts: String(formData.get("retention_days_transcripts") ?? ""),
    retention_days_worklogs: String(formData.get("retention_days_worklogs") ?? ""),
    pii_redaction_enabled: formData.get("pii_redaction_enabled") === "on",
    thresholds,
  });
  if (!parsed.ok) return parsed;
  try {
    await patchTenantSettings(parsed.value);
  } catch (err) {
    return failure(err, "The settings could not be saved just now. Try again in a moment.");
  }
  revalidatePath("/tenant/settings");
  return { ok: true, message: "Saved. New meetings follow these settings." };
}

export async function grantSupportAccess(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const staff = String(formData.get("staff_user_id") ?? "").trim();
  const scope = formData.get("scope");
  const hours = Number(formData.get("hours"));
  if (!isUuid(staff)) return { ok: false, message: "Paste the staff ID Mytheus support gave you. It looks like 8-4-4-4-12 letters and digits." };
  if (!isGrantScope(scope)) return { ok: false, message: "Pick what support may do." };
  if (!isGrantDuration(hours)) return { ok: false, message: "Pick how long access lasts." };
  try {
    await createSupportGrant({
      staff_user_id: staff,
      scope,
      expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
    });
  } catch (err) {
    return failure(err, "Access could not be granted just now. Check the staff ID and try again.");
  }
  revalidatePath("/tenant/support");
  return { ok: true, message: "Access granted. It ends on its own when the time is up." };
}

export async function revokeSupportAccess(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const id = formData.get("grant_id");
  if (!isUuid(id)) return { ok: false, message: "That grant is not valid." };
  try {
    await revokeSupportGrant(id);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) {
      return failure(err, "Access could not be revoked just now. Try again in a moment.");
    }
  }
  revalidatePath("/tenant/support");
  return { ok: true, message: "Access revoked." };
}

export async function startDataExport(): Promise<FormResult> {
  try {
    const res = await requestDataExport();
    revalidatePath("/tenant/data");
    return {
      ok: true,
      message: res.status === "completed" ? "The export is ready below." : "Export requested. It shows below and updates when it is ready.",
    };
  } catch (err) {
    return failure(err, "The export could not be requested just now. Try again in a moment.");
  }
}
