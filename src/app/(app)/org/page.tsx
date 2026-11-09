import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/settings/primitives";
import { EditTeamButton, NewDepartmentButton, NewTeamButton } from "@/components/org/OrgAdmin";
import { resolveOrgContext } from "@/lib/api/org-context";
import { listMembers } from "@/lib/api/members";
import { loadOrgStructure } from "@/lib/api/org";
import { buildOrgChart, isLeadRole, type ChartPerson, type OrgMember, type OrgTeam } from "@/lib/org-chart";

export const metadata: Metadata = { title: "Org | Mytheus" };

/* The org chart: departments, then teams, then the people on them, for the active workspace.
   Structure comes from core-api (`/api/v1/departments`, `/api/v1/teams`, each team's roster);
   names and photos come from `listMembers()`. Agents read the same structure to tune notes to
   each role and to suggest missing stakeholders. Owners and admins can add departments and
   teams and choose who is on them; core-api enforces that on every write. */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A membership label worth showing next to the email: anything other than the plain defaults. */
const roleLabel = (role: string | null) => {
  const r = role?.trim();
  return r && r.toLowerCase() !== "member" && !isLeadRole(r) ? r : null;
};

function PersonRow({ person, role, lead }: { person: ChartPerson; role?: string | null; lead?: boolean }) {
  const label = roleLabel(role ?? null);
  return (
    <li>
      <Link
        href={`/people/${person.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg sm:px-[22px]"
      >
        <Avatar name={person.name} id={person.email} src={person.imageUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">
            {person.name}
            {person.isYou && <span className="ml-1.5 font-normal text-ink-3">(you)</span>}
          </p>
          <p className="truncate text-[12.5px] text-ink-3">{label ? `${label} · ${person.email}` : person.email}</p>
        </div>
        {lead ? <Badge className="shrink-0">Lead</Badge> : null}
      </Link>
    </li>
  );
}

function TeamCard({ team, people }: { team: OrgTeam; people: { id: string; name: string; email: string }[] | null }) {
  const lead = team.members.find((m: OrgMember) => m.lead);
  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-[22px] sm:pt-[18px]">
        <h3 className="min-w-0 truncate text-[16px] font-semibold text-ink">{team.name}</h3>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[12.5px] font-semibold text-ink-3">
            {plural(team.members.length, "member", "members")}
          </span>
          {people ? (
            <EditTeamButton
              team={{ id: team.id, name: team.name, memberIds: team.members.map((m) => m.id), leadId: lead?.id ?? null }}
              people={people}
            />
          ) : null}
        </span>
      </div>
      {team.members.length === 0 ? (
        <p className="border-t border-line px-4 py-4 text-[13px] text-ink-3 sm:px-[22px]">No one on this team yet.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {team.members.map((m) => (
            <PersonRow key={m.id} person={m} role={m.role} lead={m.lead} />
          ))}
        </ul>
      )}
    </article>
  );
}

export default async function OrgPage() {
  const [ctx, members, structure] = await Promise.all([resolveOrgContext(), listMembers(), loadOrgStructure()]);
  const orgName = ctx?.org.name ?? "Org chart";

  const me = members?.find((m) => m.isYou);
  const isAdmin = me?.tier === "owner" || me?.tier === "admin";
  const people = members ? members.map((m) => ({ id: m.id, name: m.name, email: m.email })) : null;

  if (!structure) {
    return (
      <div className="mx-auto max-w-6xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
        <PageHeader title={orgName} description="Departments, teams and the people on them." />
        <EmptyState
          className="mt-8"
          title="The org chart couldn't be loaded"
          description="Something went wrong reaching the workspace. Refresh the page to try again."
        />
      </div>
    );
  }

  const chart = buildOrgChart(structure.departments, structure.teams, structure.rosters, members ?? []);
  const departments = structure.departments
    .map((d) => ({ id: d.id, name: d.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const editPeople = isAdmin ? people : null;

  const adminActions = isAdmin ? (
    <div className="flex flex-wrap gap-2">
      <NewDepartmentButton departments={departments} />
      <NewTeamButton departments={departments} people={people} />
    </div>
  ) : undefined;

  const description =
    chart.teamCount === 0
      ? "Departments, teams and the people on them. Your agents read this structure to tune notes to each role and to suggest missing stakeholders."
      : `${plural(chart.departments.filter((d) => d.id !== null).length, "department", "departments")}, ${plural(chart.teamCount, "team", "teams")}, ${plural(chart.peopleOnTeams, "person", "people")} on a team. Your agents read this structure to tune notes to each role and to suggest missing stakeholders.`;

  return (
    <div className="mx-auto max-w-6xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader title={orgName} description={description} actions={adminActions} />

      {chart.departments.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No teams yet"
          description={
            isAdmin
              ? "Add a department, or start with a team and pick who is on it from your workspace members."
              : "Once an admin sets up departments and teams, they and the people on them appear here."
          }
          action={isAdmin ? <NewTeamButton departments={departments} people={people} /> : undefined}
        />
      ) : (
        <div className="mt-8 flex flex-col gap-9">
          {chart.departments.map((dep) => {
            const headingId = `dep-${dep.id ?? "none"}`;
            return (
              <section key={dep.id ?? "none"} aria-labelledby={headingId}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 id={headingId} className="display text-[24px] text-ink-display">
                    {dep.name}
                  </h2>
                  <Badge>{plural(dep.teams.length, "team", "teams")}</Badge>
                  {dep.parentName ? <span className="text-[13px] text-ink-3">in {dep.parentName}</span> : null}
                </div>

                {dep.teams.length === 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-line px-5 py-4">
                    <p className="text-[13.5px] text-ink-3">No teams in this department yet.</p>
                    {isAdmin && dep.id ? (
                      <NewTeamButton departments={departments} people={people} defaultDepartmentId={dep.id} variant="outline" />
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    {dep.teams.map((team) => (
                      <TeamCard key={team.id} team={team} people={editPeople} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {members && chart.unassigned.length > 0 ? (
            <section aria-labelledby="unassigned-heading">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 id="unassigned-heading" className="display text-[24px] text-ink-display">
                  Not on a team
                </h2>
                <Badge>{plural(chart.unassigned.length, "person", "people")}</Badge>
              </div>
              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-sm md:max-w-[calc(50%-10px)]">
                {chart.unassigned.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
