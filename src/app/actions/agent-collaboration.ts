"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { adoptAgentAuthzTemplate, listAgentAuthzScopes, revokeAgentAuthzScope } from "@/lib/api/agent-authz";
import { isLevel, planLevelChange, type CollaborationLevel } from "@/lib/agent-collaboration";

/* The workspace's "Agent collaboration" level (Phase P10, plan 3.5). Owner and admin only:
   identity-tenant-service enforces the tier on every call, and the tenant comes from the session
   at the edge, never from the input. Narrowing revokes first, so a failure part way leaves less
   access, never more. */

export type AgentCollaborationResult = { ok: true } | { ok: false; message: string };

function failure(err: unknown): AgentCollaborationResult {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 403) return { ok: false, message: "Only workspace owners and admins can change this." };
  }
  return { ok: false, message: "The setting couldn't be saved just now. Try again in a moment." };
}

export async function setAgentCollaboration(level: CollaborationLevel): Promise<AgentCollaborationResult> {
  if (!isLevel(level)) return { ok: false, message: "Pick one of the options." };
  try {
    const { items } = await listAgentAuthzScopes();
    const plan = planLevelChange(items, level);
    for (const id of plan.revoke) {
      try {
        await revokeAgentAuthzScope(id);
      } catch (err) {
        // Already revoked elsewhere: the goal state holds for this row.
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
    }
    if (plan.template) await adoptAgentAuthzTemplate(plan.template);
  } catch (err) {
    revalidatePath("/workspace/agents");
    return failure(err);
  }
  revalidatePath("/workspace/agents");
  return { ok: true };
}
