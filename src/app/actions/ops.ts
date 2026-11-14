"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  cancelMove,
  createFlag,
  deleteFlag,
  endSupportSession,
  fetchSupportMembers,
  fetchTenantDetail,
  reinstateTenant,
  requestMove,
  changePlan,
  searchAudit,
  setFlagEnabled,
  startSupportSession,
  suspendTenant,
} from "@/lib/api/admin-ops";
import {
  REASON_MIN,
  isFlagKey,
  isRegion,
  isSessionMinutes,
  type AuditPage,
  type MoveRequest,
  type SupportMember,
  type SupportSessionView,
  type TenantDetail,
} from "@/lib/ops";
import { isUuid } from "@/lib/tenant-admin";
import { STAFF_PLANS } from "@/lib/plans";
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
  revalidatePath("/ops/workspaces");
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

/** One tenant at a time: admin-ops-service requires `org_id` (422 without it). */
export async function searchAuditLog(
  orgId: string,
  cursor: string | null,
): Promise<{ ok: true; page: AuditPage } | { ok: false; message: string; noGrant?: boolean }> {
  if (!isUuid(orgId)) return { ok: false, message: "Pick a tenant to see its audit log." };
  if (cursor !== null && (typeof cursor !== "string" || cursor.length > 512)) return { ok: false, message: "That page is not valid." };
  try {
    return { ok: true, page: await searchAudit({ org_id: orgId, cursor, limit: 50 }) };
  } catch (err) {
    // Staff can see that a workspace exists, but not what happened in it, until that workspace
    // grants support access (ADR-0046). Say so rather than calling this a staff-list problem.
    if (err instanceof ApiError && err.reason === "no_support_grant") {
      return {
        ok: false,
        noGrant: true,
        message: "This workspace has not granted you support access, so its audit log stays private.",
      };
    }
    return failure(err, "The audit log could not be loaded just now. Try again in a moment.");
  }
}

/* --- The superadmin console (ADR-0046) -------------------------------------------------------
   The workspace panel opens on demand, so its read is a server action too; like every call
   above, admin-ops-service decides who may make it and logs it. */

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

export async function loadTenantDetail(orgId: string): Promise<Result<TenantDetail>> {
  if (!isUuid(orgId)) return { ok: false, message: "That workspace is not valid." };
  try {
    return { ok: true, data: await fetchTenantDetail(orgId) };
  } catch (err) {
    return failure(err, "The workspace could not be loaded just now. Try again in a moment.");
  }
}

export async function requestTenantMove(orgId: string, region: string, reason: string): Promise<Result<MoveRequest>> {
  if (!isUuid(orgId)) return { ok: false, message: "That workspace is not valid." };
  if (!isRegion(region)) return { ok: false, message: "Pick a region." };
  const why = reason.trim().slice(0, 500);
  if (why.length < REASON_MIN) return { ok: false, message: "Give a reason of at least a few words." };
  try {
    const data = await requestMove({ org_id: orgId, to_region: region, to_cell: null, reason: why });
    revalidatePath("/ops/workspaces");
    return { ok: true, data };
  } catch (err) {
    return failure(err, "The move could not be requested just now. Try again in a moment.");
  }
}

/** Put a workspace on any plan, Unlimited included, with no payment (staff only, logged). */
export async function setTenantPlan(orgId: string, planCode: string, reason: string): Promise<OpsResult> {
  if (!isUuid(orgId)) return { ok: false, message: "That workspace is not valid." };
  if (!(STAFF_PLANS as string[]).includes(planCode)) return { ok: false, message: "Pick a plan." };
  try {
    await changePlan({ org_id: orgId, plan_code: planCode, reason: reason.trim().slice(0, 500) || null });
  } catch (err) {
    return failure(err, "The plan could not be changed just now. Try again in a moment.");
  }
  revalidatePath("/ops/workspaces");
  revalidatePath("/ops/costs");
  revalidatePath("/ops");
  return { ok: true };
}

export async function cancelTenantMove(orgId: string, migrationId: string): Promise<OpsResult> {
  if (!isUuid(orgId) || !isUuid(migrationId)) return { ok: false, message: "That request is not valid." };
  try {
    await cancelMove(orgId, migrationId);
  } catch (err) {
    return failure(err, "The request could not be cancelled just now. Try again in a moment.");
  }
  return { ok: true };
}

export async function listSupportMembers(orgId: string): Promise<Result<{ items: SupportMember[]; grant_expires_at: string }>> {
  if (!isUuid(orgId)) return { ok: false, message: "That workspace is not valid." };
  try {
    return { ok: true, data: await fetchSupportMembers(orgId) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return { ok: false, message: "This workspace has not given you an impersonate grant. An owner or admin can add one under Workspace, Support access." };
    }
    return failure(err, "The members could not be loaded just now. Try again in a moment.");
  }
}

export async function beginSupportSession(
  orgId: string,
  userId: string,
  reason: string,
  minutes: number,
): Promise<Result<{ session: SupportSessionView; sign_in_url: string }>> {
  if (!isUuid(orgId) || !isUuid(userId)) return { ok: false, message: "Pick a member." };
  if (!isSessionMinutes(minutes)) return { ok: false, message: "Pick a length." };
  const why = reason.trim().slice(0, 500);
  if (why.length < REASON_MIN) return { ok: false, message: "Give a reason of at least a few words." };
  try {
    return { ok: true, data: await startSupportSession({ org_id: orgId, user_id: userId, reason: why, minutes }) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      return { ok: false, message: "Clerk could not open the session. Check that the backend has a Clerk secret key, then try again." };
    }
    if (err instanceof ApiError && err.status === 403) {
      return { ok: false, message: "The impersonate grant has expired or was revoked." };
    }
    return failure(err, "The session could not be started just now. Try again in a moment.");
  }
}

export async function finishSupportSession(orgId: string, sessionId: string): Promise<OpsResult> {
  if (!isUuid(orgId) || !isUuid(sessionId)) return { ok: false, message: "That session is not valid." };
  try {
    await endSupportSession(orgId, sessionId);
  } catch (err) {
    return failure(err, "The session could not be ended just now. Try again in a moment.");
  }
  return { ok: true };
}
