"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api/client";
import { planRosterChanges, type ApiTeamMember } from "@/lib/org-chart";

/* People (org chart) writes: departments, teams and who is on them, all through core-api. Only a
   workspace admin may make them; core-api enforces that (`require_tier("admin")`), and the UI
   only hides the buttons from everyone else. Nothing about the tenant comes from the input. */

export type OrgActionResult = { ok: true; warning?: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cleanIds = (ids: string[]) => Array.from(new Set(ids.filter((id) => UUID.test(id)))).slice(0, 200);

function failure(err: unknown, fallback: string): OrgActionResult {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 403) return { ok: false, message: "Only workspace admins can change People." };
    if (err.status === 404) return { ok: false, message: "That team, department or person is no longer in this workspace." };
    if (err.status === 422) return { ok: false, message: "That name wasn't accepted. Keep it under 200 characters." };
  }
  return { ok: false, message: fallback };
}

function cleanName(name: string): string | null {
  const n = name.trim();
  return n && n.length <= 200 ? n : null;
}

/** Bring a team's roster to `memberIds`, with `leadId` as lead. Returns how many writes failed. */
async function syncRoster(teamId: string, memberIds: string[], leadId: string | null): Promise<number> {
  const current = await api<ApiTeamMember[]>(`/api/v1/teams/${teamId}/members`);
  const changes = planRosterChanges(current, cleanIds(memberIds), leadId);
  const results = await Promise.allSettled(
    changes.map((c) =>
      c.kind === "put"
        ? api(`/api/v1/teams/${teamId}/members/${c.userId}`, { method: "PUT", body: { role: c.role } })
        : api(`/api/v1/teams/${teamId}/members/${c.userId}`, { method: "DELETE" }),
    ),
  );
  return results.filter((r) => r.status === "rejected").length;
}

export async function createDepartment(input: { name: string; parentId: string | null }): Promise<OrgActionResult> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, message: "Give the department a name." };
  const parentId = input.parentId && UUID.test(input.parentId) ? input.parentId : null;
  try {
    await api("/api/v1/departments", { method: "POST", body: { name, parent_id: parentId } });
  } catch (err) {
    return failure(err, "The department couldn't be created just now. Try again in a moment.");
  }
  revalidatePath("/people");
  return { ok: true };
}

export async function createTeam(input: {
  name: string;
  departmentId: string | null;
  memberIds: string[];
  leadId: string | null;
}): Promise<OrgActionResult> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, message: "Give the team a name." };
  const departmentId = input.departmentId && UUID.test(input.departmentId) ? input.departmentId : null;

  let teamId: string;
  try {
    const team = await api<{ id: string }>("/api/v1/teams", {
      method: "POST",
      body: { name, department_id: departmentId },
    });
    teamId = team.id;
  } catch (err) {
    return failure(err, "The team couldn't be created just now. Try again in a moment.");
  }

  let failed = 0;
  try {
    failed = await syncRoster(teamId, input.memberIds, input.leadId);
  } catch {
    failed = 1;
  }
  revalidatePath("/people");
  return failed > 0
    ? { ok: true, warning: "The team was created, but some people couldn't be added. Use Edit team to try again." }
    : { ok: true };
}

export async function updateTeamMembers(input: {
  teamId: string;
  memberIds: string[];
  leadId: string | null;
}): Promise<OrgActionResult> {
  if (!UUID.test(input.teamId)) return { ok: false, message: "That team no longer exists." };
  let failed: number;
  try {
    failed = await syncRoster(input.teamId, input.memberIds, input.leadId);
  } catch (err) {
    return failure(err, "The team couldn't be updated just now. Try again in a moment.");
  }
  revalidatePath("/people");
  return failed > 0 ? { ok: false, message: "Some changes didn't go through. Check the team and try again." } : { ok: true };
}
