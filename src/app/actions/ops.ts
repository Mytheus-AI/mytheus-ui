"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { createFlag, deleteFlag, reinstateTenant, searchAudit, setFlagEnabled, suspendTenant } from "@/lib/api/admin-ops";
import { REASON_MIN, isFlagKey, type AuditPage } from "@/lib/ops";
import { isUuid } from "@/lib/tenant-admin";
import type { FormResult } from "@/app/actions/tenant-admin";

/* Writes and the audit search for the internal-ops console (Phase P12, plan 3.13 step 3).
   Server actions are reachable by any signed-in user, so none of them is a gate: admin-ops-service
   answers 403 to anyone not in `MYTHEUS_STAFF_USER_IDS` and logs every call, reads included, to
   `ops_audit_log`. The ids taken here are targets the staff member picked (a tenant, a flag),
   validated as uuids; the caller's own tenant is still derived from the session at the edge. */

export type OpsResult = { ok: true } | { ok: false; message: string };

function failure(err: unknown, fallback: string): { ok: false; message: string } {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 403) return { ok: false, message: "This account is not on the Mytheus staff list." };
    if (err.status === 404) return { ok: false, message: "That is no longer here. Refresh to see the current list." };
    if (err.status === 409 || err.status === 422) {
      return { ok: false, message: err.message && !/^HTTP \d+$/.test(err.message) ? err.message : fallback };
    }
  }
  return { ok: false, message: fallback };
}

export async function setTenantSuspended(orgId: string, verb: "suspend" | "reinstate", reason: string): Promise<OpsResult> {
  if (!isUuid(orgId)) return { ok: false, message: "That tenant is not valid." };
  if (verb !== "suspend" && verb !== "reinstate") return { ok: false, message: "Unknown action." };
  const why = reason.trim().slice(0, 500);
  if (verb === "suspend" && why.length < REASON_MIN) return { ok: false, message: "Give a reason of at least a few words." };
  try {
    if (verb === "suspend") await suspendTenant(orgId, why);
    else await reinstateTenant(orgId);
  } catch (err) {
    return failure(err, `The tenant could not be ${verb === "suspend" ? "suspended" : "reinstated"} just now. Try again in a moment.`);
  }
  revalidatePath("/ops");
  return { ok: true };
}

export async function createFeatureFlag(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const key = String(formData.get("key") ?? "").trim();
  const scope = String(formData.get("org_id") ?? "global");
  const enabled = formData.get("enabled") === "on";
  if (!isFlagKey(key)) return { ok: false, message: "Use a lowercase key like live_notes.v2 (letters, digits, dot, dash, underscore)." };
  const orgId = scope === "global" ? null : scope;
  if (orgId !== null && !isUuid(orgId)) return { ok: false, message: "Pick a tenant or All tenants." };
  try {
    await createFlag({ key, org_id: orgId, enabled });
  } catch (err) {
    return failure(err, "The flag could not be created just now. Try again in a moment.");
  }
  revalidatePath("/ops/flags");
  return { ok: true, message: `Flag ${key} created.` };
}

export async function toggleFeatureFlag(id: string, enabled: boolean): Promise<OpsResult> {
  if (!isUuid(id)) return { ok: false, message: "That flag is not valid." };
  try {
    await setFlagEnabled(id, enabled === true);
  } catch (err) {
    return failure(err, "The flag could not be changed just now. Try again in a moment.");
  }
  revalidatePath("/ops/flags");
  return { ok: true };
}

export async function removeFeatureFlag(id: string): Promise<OpsResult> {
  if (!isUuid(id)) return { ok: false, message: "That flag is not valid." };
  try {
    await deleteFlag(id);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) return failure(err, "The flag could not be deleted just now. Try again in a moment.");
  }
  revalidatePath("/ops/flags");
  return { ok: true };
}

export async function searchAuditLog(
  orgId: string | null,
  cursor: string | null,
): Promise<{ ok: true; page: AuditPage } | { ok: false; message: string }> {
  if (orgId !== null && !isUuid(orgId)) return { ok: false, message: "Pick a tenant or All tenants." };
  if (cursor !== null && (typeof cursor !== "string" || cursor.length > 512)) return { ok: false, message: "That page is not valid." };
  try {
    return { ok: true, page: await searchAudit({ org_id: orgId, cursor, limit: 50 }) };
  } catch (err) {
    return failure(err, "The audit log could not be loaded just now. Try again in a moment.");
  }
}
