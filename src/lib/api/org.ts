import { apiSafe } from "./client";
import type { ApiDepartment, ApiTeam, ApiTeamMember } from "@/lib/org-chart";

/* The org structure from core-api. SERVER-ONLY (it goes through `api()`, which uses the
   session). Departments and teams are two flat lists; each team's roster is its own read
   (`/api/v1/teams/{id}/members`), fetched in parallel. A workspace has a handful of teams, so
   that fan-out stays small. Names are not here: the roster carries internal user ids, which the
   page joins against `listMembers()`. */

export type OrgStructure = {
  departments: ApiDepartment[];
  teams: ApiTeam[];
  rosters: ApiTeamMember[];
};

/** `null` when any part could not be loaded: a half-drawn org chart would misstate who is where. */
export async function loadOrgStructure(): Promise<OrgStructure | null> {
  const [deps, teams] = await Promise.all([
    apiSafe<ApiDepartment[]>("/api/v1/departments"),
    apiSafe<ApiTeam[]>("/api/v1/teams"),
  ]);
  if (!deps.ok || !teams.ok) return null;

  const rosters = await Promise.all(
    teams.data.map((t) => apiSafe<ApiTeamMember[]>(`/api/v1/teams/${encodeURIComponent(t.id)}/members`)),
  );
  if (rosters.some((r) => !r.ok)) return null;

  return {
    departments: deps.data,
    teams: teams.data,
    rosters: rosters.flatMap((r) => (r.ok ? r.data : [])),
  };
}
