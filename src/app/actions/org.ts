"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api/client";
import { DESCRIPTION_MAX, isLeadRole, planRosterChanges, type ApiTeamMember } from "@/lib/org-chart";

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
    if (err.status === 422)
      return { ok: false, message: "That wasn't accepted. Keep names under 200 characters and descriptions under 1000." };
  }
  return { ok: false, message: fallback };
}

function cleanName(name: string): string | null {
  const n = name.trim();
  return n && n.length <= 200 ? n : null;
}

/** Trimmed; "" clears it. `undefined` when it is too long (the caller says so). */
function cleanDescription(text: string | null | undefined): string | null | undefined {
  const t = (text ?? "").trim();
  if (t.length > DESCRIPTION_MAX) return undefined;
  return t || null;
}

const id = (raw: string | null | undefined) => (raw && UUID.test(raw) ? raw : null);
const TOO_LONG: OrgActionResult = { ok: false, message: `Keep the description under ${DESCRIPTION_MAX} characters.` };

function done(): OrgActionResult {
  revalidatePath("/people");
  return { ok: true };
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

export async function createDepartment(input: {
  name: string;
  parentId: string | null;
  description?: string | null;
}): Promise<OrgActionResult> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, message: "Give the department a name." };
  const description = cleanDescription(input.description);
  if (description === undefined) return TOO_LONG;
  const parentId = input.parentId && UUID.test(input.parentId) ? input.parentId : null;
  try {
    await api("/api/v1/departments", { method: "POST", body: { name, parent_id: parentId, description } });
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
  description?: string | null;
}): Promise<OrgActionResult> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, message: "Give the team a name." };
  const description = cleanDescription(input.description);
  if (description === undefined) return TOO_LONG;
  const departmentId = input.departmentId && UUID.test(input.departmentId) ? input.departmentId : null;

  let teamId: string;
  try {
    const team = await api<{ id: string }>("/api/v1/teams", {
      method: "POST",
      body: { name, department_id: departmentId, description },
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

/* --- Editing the structure: rename, describe, move, delete --------------------------------- */

/** Rename, describe or move a department under another one (`parentId: null` = top level).
    Only the fields passed change. */
export async function updateDepartment(input: {
  departmentId: string;
  name?: string;
  description?: string | null;
  parentId?: string | null;
}): Promise<OrgActionResult> {
  const deptId = id(input.departmentId);
  if (!deptId) return { ok: false, message: "That department no longer exists." };
  const body: Record<string, string | null> = {};
  if (input.name !== undefined) {
    const name = cleanName(input.name);
    if (!name) return { ok: false, message: "Give the department a name." };
    body.name = name;
  }
  if (input.description !== undefined) {
    const description = cleanDescription(input.description);
    if (description === undefined) return TOO_LONG;
    body.description = description;
  }
  if (input.parentId !== undefined) {
    if (input.parentId === deptId) return { ok: false, message: "A department cannot sit under itself." };
    body.parent_id = id(input.parentId);
  }
  try {
    await api(`/api/v1/departments/${deptId}`, { method: "PATCH", body });
  } catch (err) {
    if (err instanceof ApiError && err.status === 422 && input.parentId !== undefined)
      return { ok: false, message: "A department cannot sit under itself or one of its own departments." };
    return failure(err, "The department couldn't be saved just now. Try again in a moment.");
  }
  return done();
}

/** Delete a department. core-api moves its teams to No department; nothing else is deleted. */
export async function deleteDepartment(input: { departmentId: string }): Promise<OrgActionResult> {
  const deptId = id(input.departmentId);
  if (!deptId) return { ok: false, message: "That department no longer exists." };
  try {
    await api(`/api/v1/departments/${deptId}`, { method: "DELETE" });
  } catch (err) {
    return failure(err, "The department couldn't be deleted just now. Try again in a moment.");
  }
  return done();
}

/** Rename, describe or move a team to another department (`departmentId: null` = No department). */
export async function updateTeam(input: {
  teamId: string;
  name?: string;
  description?: string | null;
  departmentId?: string | null;
}): Promise<OrgActionResult> {
  const teamId = id(input.teamId);
  if (!teamId) return { ok: false, message: "That team no longer exists." };
  const body: Record<string, string | null> = {};
  if (input.name !== undefined) {
    const name = cleanName(input.name);
    if (!name) return { ok: false, message: "Give the team a name." };
    body.name = name;
  }
  if (input.description !== undefined) {
    const description = cleanDescription(input.description);
    if (description === undefined) return TOO_LONG;
    body.description = description;
  }
  if (input.departmentId !== undefined) body.department_id = id(input.departmentId);
  try {
    await api(`/api/v1/teams/${teamId}`, { method: "PATCH", body });
  } catch (err) {
    return failure(err, "The team couldn't be saved just now. Try again in a moment.");
  }
  return done();
}

/** Delete a team. The people on it stay in the workspace; only their place on this team goes. */
export async function deleteTeam(input: { teamId: string }): Promise<OrgActionResult> {
  const teamId = id(input.teamId);
  if (!teamId) return { ok: false, message: "That team no longer exists." };
  try {
    await api(`/api/v1/teams/${teamId}`, { method: "DELETE" });
  } catch (err) {
    return failure(err, "The team couldn't be deleted just now. Try again in a moment.");
  }
  return done();
}

/** Put one person on a team (as a member; a label they already had there is kept). */
export async function addTeamMember(input: { teamId: string; userId: string }): Promise<OrgActionResult> {
  const teamId = id(input.teamId);
  const userId = id(input.userId);
  if (!teamId || !userId) return { ok: false, message: "That team or person is no longer in this workspace." };
  try {
    const roster = await api<ApiTeamMember[]>(`/api/v1/teams/${teamId}/members`);
    if (roster.some((m) => m.user_id === userId)) return done();
    await api(`/api/v1/teams/${teamId}/members/${userId}`, { method: "PUT", body: { role: "member" } });
  } catch (err) {
    return failure(err, "They couldn't be added just now. Try again in a moment.");
  }
  return done();
}

/** Take one person off a team. */
export async function removeTeamMember(input: { teamId: string; userId: string }): Promise<OrgActionResult> {
  const teamId = id(input.teamId);
  const userId = id(input.userId);
  if (!teamId || !userId) return { ok: false, message: "That team or person is no longer in this workspace." };
  try {
    await api(`/api/v1/teams/${teamId}/members/${userId}`, { method: "DELETE" });
  } catch (err) {
    return failure(err, "They couldn't be removed just now. Try again in a moment.");
  }
  return done();
}

/** Move one person from a team to another in one step (core-api does it in one transaction).
    A lead arrives as a plain member: the new team may already have one. */
export async function moveTeamMember(input: { fromTeamId: string; toTeamId: string; userId: string }): Promise<OrgActionResult> {
  const from = id(input.fromTeamId);
  const to = id(input.toTeamId);
  const userId = id(input.userId);
  if (!from || !to || !userId) return { ok: false, message: "That team or person is no longer in this workspace." };
  if (from === to) return { ok: false, message: "Pick a different team." };
  try {
    const roster = await api<ApiTeamMember[]>(`/api/v1/teams/${from}/members`);
    const had = roster.find((m) => m.user_id === userId)?.role ?? null;
    await api(`/api/v1/teams/${from}/members/${userId}/move`, {
      method: "POST",
      body: isLeadRole(had) ? { to_team_id: to, role: "member" } : { to_team_id: to },
    });
  } catch (err) {
    return failure(err, "They couldn't be moved just now. Try again in a moment.");
  }
  return done();
}

/** Make one person the team's lead (the former lead becomes a member), or clear the lead. */
export async function setTeamLead(input: { teamId: string; userId: string | null }): Promise<OrgActionResult> {
  const teamId = id(input.teamId);
  if (!teamId) return { ok: false, message: "That team no longer exists." };
  let failed: number;
  try {
    const current = await api<ApiTeamMember[]>(`/api/v1/teams/${teamId}/members`);
    failed = await syncRoster(
      teamId,
      current.map((m) => m.user_id),
      id(input.userId),
    );
  } catch (err) {
    return failure(err, "The lead couldn't be changed just now. Try again in a moment.");
  }
  revalidatePath("/people");
  return failed > 0 ? { ok: false, message: "The lead couldn't be changed. Try again." } : { ok: true };
}
