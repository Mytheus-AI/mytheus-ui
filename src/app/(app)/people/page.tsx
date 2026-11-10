import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHead, cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Page, PageHead } from "@/components/ui/Page";
import { EditTeamButton, NewDepartmentButton, NewTeamButton } from "@/components/org/OrgAdmin";
import { resolveOrgContext } from "@/lib/api/org-context";
import { listMembers } from "@/lib/api/members";
import { loadOrgStructure } from "@/lib/api/org";
import { buildOrgChart, isLeadRole, type ChartPerson, type OrgMember, type OrgTeam } from "@/lib/org-chart";

export const metadata: Metadata = { title: "People | Mytheus" };

/* People (the org chart): departments, then teams, then the people on them, for the active
   workspace; each person opens their own page.
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
        className="group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-offset-[-2px] sm:px-[22px]"
      >
        <Avatar name={person.name} id={person.email} src={person.imageUrl ?? undefined} size="md" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-ink group-hover:underline group-hover:underline-offset-4">
              {person.name}
            </span>
            {person.isYou ? <Chip className="shrink-0">You</Chip> : null}
          </span>
          <span className="block truncate text-[14px] text-ink-3">{person.email}</span>
        </span>
        <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {label ? <Chip className="max-w-[10rem] truncate">{label}</Chip> : null}
          {lead ? <Chip tone="accent">Lead</Chip> : null}
        </span>
      </Link>
    </li>
  );
}

function TeamCard({ team, people }: { team: OrgTeam; people: { id: string; name: string; email: string }[] | null }) {
  const lead = team.members.find((m: OrgMember) => m.lead);
  return (
    <Card as="article" flush>
      <CardHead
        as="h3"
        title={team.name}
        description={`${plural(team.members.length, "member", "members")}${lead ? `, led by ${lead.name}` : ""}`}
        right={
          people ? (
            <EditTeamButton
              team={{ id: team.id, name: team.name, memberIds: team.members.map((m) => m.id), leadId: lead?.id ?? null }}
              people={people}
            />
          ) : undefined
        }
      />
      {team.members.length === 0 ? (
        <p className="border-t border-line px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">No one on this team yet.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {team.members.map((m) => (
            <PersonRow key={m.id} person={m} role={m.role} lead={m.lead} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function PeoplePage() {
  const [ctx, members, structure] = await Promise.all([resolveOrgContext(), listMembers(), loadOrgStructure()]);
  const orgName = ctx?.org.name || "your workspace";

  const me = members?.find((m) => m.isYou);
  const isAdmin = me?.tier === "owner" || me?.tier === "admin";
  const people = members ? members.map((m) => ({ id: m.id, name: m.name, email: m.email })) : null;

  if (!structure) {
    return (
      <Page>
        <PageHead title="People" context={`The departments and teams in ${orgName}, and the people on them.`} />
        <ErrorState title="People could not be loaded" text="Something went wrong reaching the workspace. Nothing was lost." />
      </Page>
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
    <Page>
      <PageHead title="People" context={description} action={adminActions} />

      {chart.departments.length === 0 ? (
        <EmptyState
          art="people"
          title="No teams yet"
          description={
            isAdmin
              ? "Add a department, or start with a team and pick who is on it from your workspace members."
              : "Once an admin sets up departments and teams, they and the people on them appear here."
          }
          action={isAdmin ? <NewTeamButton departments={departments} people={people} /> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-10">
          {chart.departments.map((dep) => {
            const headingId = `dep-${dep.id ?? "none"}`;
            return (
              <section key={dep.id ?? "none"} aria-labelledby={headingId}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 id={headingId} className="display text-[22px] text-ink-display">
                    {dep.name}
                  </h2>
                  <Chip>{plural(dep.teams.length, "team", "teams")}</Chip>
                  {dep.parentName ? <span className="text-[14px] text-ink-3">Part of {dep.parentName}</span> : null}
                </div>

                {dep.teams.length === 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-line-2 bg-surface-2 px-4 py-[18px] sm:px-[22px]">
                    <p className="text-[14px] text-ink-3">No teams in this department yet.</p>
                    {isAdmin && dep.id ? (
                      <NewTeamButton departments={departments} people={people} defaultDepartmentId={dep.id} variant="outline" />
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
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
                <h2 id="unassigned-heading" className="display text-[22px] text-ink-display">
                  Not on a team
                </h2>
                <Chip>{plural(chart.unassigned.length, "person", "people")}</Chip>
              </div>
              <ul className={cardClass({ flush: true, className: "mt-4 divide-y divide-line md:max-w-[calc(50%-10px)]" })}>
                {chart.unassigned.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Page>
  );
}
