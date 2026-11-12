import type { Metadata } from "next";
import { LockSimple } from "@phosphor-icons/react/ssr";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { Page, PageHead } from "@/components/ui/Page";
import { NewDepartmentButton, NewTeamButton } from "@/components/org/OrgAdmin";
import { PeopleBoard } from "@/components/org/PeopleBoard";
import { resolveOrgContext } from "@/lib/api/org-context";
import { listMembers } from "@/lib/api/members";
import { loadOrgStructure } from "@/lib/api/org";
import { buildOrgChart, plural } from "@/lib/org-chart";

export const metadata: Metadata = { title: "People | Mytheus" };

/* People (the org chart): departments, then teams, then the people on them, for the active
   workspace; each person opens their own page.
   Structure comes from core-api (`/api/v1/departments`, `/api/v1/teams`, each team's roster),
   including what each department and team does; names and photos come from `listMembers()`.
   Agents read the same structure and descriptions (the company brain) to tune notes to each role
   and to suggest missing stakeholders. Owners and admins can create, rename, describe, move and
   delete departments and teams and choose who is on them; core-api enforces that on every write,
   and everyone else sees the page read-only. */

const AGENTS_LINE = "Your Mytes read this structure, and what each part does, to tune notes to each role and to suggest missing stakeholders.";

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
    .map((d) => ({ id: d.id, name: d.name, parentId: d.parent_id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const memberOptions = members ? members.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.imageUrl, isYou: m.isYou })) : null;

  const adminActions = isAdmin ? (
    <>
      <NewDepartmentButton departments={departments} />
      <NewTeamButton departments={departments} people={people} />
    </>
  ) : undefined;

  const description =
    chart.teamCount === 0
      ? `Departments, teams and the people on them in ${orgName}. ${AGENTS_LINE}`
      : `${plural(chart.departments.filter((d) => d.id !== null).length, "department", "departments")}, ${plural(chart.teamCount, "team", "teams")}, ${plural(chart.peopleOnTeams, "person", "people")} on a team. ${AGENTS_LINE}`;

  return (
    <Page>
      <PageHead title="People" context={description} action={adminActions}>
        {!isAdmin ? (
          <p className="mt-3 flex items-center gap-2 text-[14px] text-ink-3">
            <LockSimple size={16} aria-hidden />
            Only workspace owners and admins can change departments and teams.
          </p>
        ) : null}
      </PageHead>

      {members === null ? (
        <Note tone="warning" className="mb-6">
          Workspace members could not be loaded, so names are missing and people can&apos;t be added right now. Reload to try again.
        </Note>
      ) : null}

      {chart.departments.length === 0 ? (
        <EmptyState
          art="people"
          title="No departments or teams yet"
          description={
            isAdmin
              ? "Start with a department, like Engineering, or a team. Say what each one does: Mytes use it to tune notes to every role and to spot who is missing from a meeting."
              : "Once an admin sets up departments and teams, they and the people on them appear here."
          }
          action={
            isAdmin ? (
              <>
                <NewDepartmentButton departments={departments} variant="primary" />
                <NewTeamButton departments={departments} people={people} variant="outline" />
              </>
            ) : undefined
          }
        />
      ) : (
        <PeopleBoard chart={chart} departments={departments} members={memberOptions} canEdit={isAdmin} />
      )}
    </Page>
  );
}
