/* The org chart, assembled from core-api's flat lists (`/api/v1/departments`, `/api/v1/teams`,
   `/api/v1/teams/{id}/members`) and the workspace member list (`listMembers()`, which carries the
   Clerk names). Pure, so it can be tested without a session: no server or client imports here. */

/* `description` is what the unit does and is responsible for (up to 1000 characters). Agents read
   it through the company brain; an older core-api leaves it out, which reads as "none". */
export type ApiDepartment = { id: string; name: string; parent_id: string | null; description?: string | null };
export type ApiTeam = { id: string; name: string; department_id: string | null; description?: string | null };

/** The most a description may hold (core-api's limit, also a database CHECK). */
export const DESCRIPTION_MAX = 1000;
export type ApiTeamMember = { team_id: string; user_id: string; role: string | null };

/** The fields of a workspace member the chart needs. `listMembers()` rows satisfy it. */
export type ChartPerson = {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  isYou: boolean;
};

export type OrgMember = ChartPerson & {
  /** The free-text label on the membership (`lead`, `member`, or anything an admin typed). */
  role: string | null;
  lead: boolean;
};

export type OrgTeam = {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  members: OrgMember[];
};

export type OrgDepartment = {
  /** null for the "No department" group of teams filed under none. */
  id: string | null;
  name: string;
  description: string | null;
  parentId: string | null;
  /** The parent department's name, for a nested department. */
  parentName: string | null;
  /** How deep it is nested (0 for a top-level department). */
  depth: number;
  teams: OrgTeam[];
};

export type OrgChart = {
  departments: OrgDepartment[];
  teamCount: number;
  /** Distinct people on at least one team. */
  peopleOnTeams: number;
  /** Workspace members on no team at all. */
  unassigned: ChartPerson[];
};

export const NO_DEPARTMENT = "No department";

export const isLeadRole = (role: string | null | undefined) => role?.trim().toLowerCase() === "lead";

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

export function buildOrgChart(
  departments: ApiDepartment[],
  teams: ApiTeam[],
  rosters: ApiTeamMember[],
  people: ChartPerson[],
): OrgChart {
  const personById = new Map(people.map((p) => [p.id, p]));
  const deptById = new Map(departments.map((d) => [d.id, d]));

  const membersByTeam = new Map<string, OrgMember[]>();
  const onATeam = new Set<string>();
  for (const r of rosters) {
    // Someone on a roster but not in the member list has left the workspace (or the list
    // could not name them). There is nothing honest to show for them, so they are left out.
    const person = personById.get(r.user_id);
    if (!person) continue;
    onATeam.add(person.id);
    const list = membersByTeam.get(r.team_id) ?? [];
    list.push({ ...person, role: r.role, lead: isLeadRole(r.role) });
    membersByTeam.set(r.team_id, list);
  }

  const toTeam = (t: ApiTeam): OrgTeam => ({
    id: t.id,
    name: t.name,
    description: t.description?.trim() || null,
    departmentId: t.department_id && deptById.has(t.department_id) ? t.department_id : null,
    members: (membersByTeam.get(t.id) ?? []).sort(
      (a, b) => Number(b.lead) - Number(a.lead) || a.name.localeCompare(b.name),
    ),
  });
  const allTeams = teams.map(toTeam).sort(byName);

  // Depth-first over the department tree so a child sits right after its parent. A parent that
  // is missing (deleted) or a cycle makes a department a root rather than dropping it.
  const children = new Map<string | null, ApiDepartment[]>();
  for (const d of departments) {
    const parent = d.parent_id && deptById.has(d.parent_id) && d.parent_id !== d.id ? d.parent_id : null;
    children.set(parent, [...(children.get(parent) ?? []), d]);
  }
  const ordered: { d: ApiDepartment; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const d of (children.get(parent) ?? []).sort(byName)) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      ordered.push({ d, depth });
      walk(d.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const d of [...departments].sort(byName)) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      ordered.push({ d, depth: 0 });
      walk(d.id, 1);
    }
  }

  const result: OrgDepartment[] = ordered.map(({ d, depth }) => {
    const parentId = d.parent_id && deptById.has(d.parent_id) && d.parent_id !== d.id ? d.parent_id : null;
    return {
      id: d.id,
      name: d.name,
      description: d.description?.trim() || null,
      parentId,
      parentName: parentId ? (deptById.get(parentId)?.name ?? null) : null,
      depth,
      teams: allTeams.filter((t) => t.departmentId === d.id),
    };
  });
  const loose = allTeams.filter((t) => t.departmentId === null);
  if (loose.length > 0)
    result.push({ id: null, name: NO_DEPARTMENT, description: null, parentId: null, parentName: null, depth: 0, teams: loose });

  return {
    departments: result,
    teamCount: allTeams.length,
    peopleOnTeams: onATeam.size,
    unassigned: people.filter((p) => !onATeam.has(p.id)),
  };
}

export type RosterChange =
  | { kind: "put"; userId: string; role: string }
  | { kind: "delete"; userId: string };

/**
 * What to send to make a team's roster `desiredIds`, with `leadId` (if any) as its lead.
 *
 * The role column is a free-text label, so a member keeps whatever label they had unless the
 * lead changes: the new lead becomes `lead`, a former lead drops to `member`, and a newcomer
 * joins as `member`.
 */
export function planRosterChanges(
  current: { user_id: string; role: string | null }[],
  desiredIds: string[],
  leadId: string | null,
): RosterChange[] {
  const desired = new Set(desiredIds);
  const lead = leadId && desired.has(leadId) ? leadId : null;
  const now = new Map(current.map((m) => [m.user_id, m.role]));
  const changes: RosterChange[] = [];

  for (const id of Array.from(desired)) {
    const had = now.get(id);
    const role =
      id === lead
        ? "lead"
        : had === undefined || had === null || isLeadRole(had)
          ? "member"
          : had;
    if (had === undefined || had !== role) changes.push({ kind: "put", userId: id, role });
  }
  for (const id of Array.from(now.keys())) {
    if (!desired.has(id)) changes.push({ kind: "delete", userId: id });
  }
  return changes;
}

/** Every department below `id` (its children, their children...), for "move under" pickers: a
    department cannot sit under itself or anything inside it. */
export function descendantsOf(departments: { id: string; parent_id: string | null }[], id: string): Set<string> {
  const out = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const at = queue.shift()!;
    for (const d of departments) {
      if (d.parent_id === at && !out.has(d.id) && d.id !== id) {
        out.add(d.id);
        queue.push(d.id);
      }
    }
  }
  return out;
}

/** "3 members", "1 member". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
