import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import type { MemberOption } from "@/components/ui/MemberPicker";
import { plural, type ChartPerson, type OrgChart, type OrgDepartment } from "@/lib/org-chart";
import { DepartmentMenu, NewTeamButton, type PickDepartment, type PickPerson } from "./OrgAdmin";
import { DescriptionText } from "./DescriptionText";
import { TeamCard } from "./TeamCard";

/* The People board: one section per department (name, what it does, its menu for admins), a
   responsive grid of team cards under it (one column on phones, two from md, three from xl, so
   the page uses its full width), then the No department group and the people on no team.
   A server component: the interactive pieces (menus, dialogs, the team card) are client leaves. */

export const teamGridClass = "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

export function PeopleBoard({
  chart,
  departments,
  members,
  canEdit,
}: {
  chart: OrgChart;
  /** every live department, for the pickers */
  departments: PickDepartment[];
  /** workspace members; null when they could not be loaded */
  members: MemberOption[] | null;
  canEdit: boolean;
}) {
  const people: PickPerson[] | null = members ? members.map((m) => ({ id: m.id, name: m.name, email: m.email })) : null;
  const teams = chart.departments.flatMap((d) => d.teams.map((t) => ({ id: t.id, name: t.name }))).sort((a, b) => a.name.localeCompare(b.name));
  const edit = canEdit ? { departments, teams, members } : null;

  return (
    <div className="flex flex-col gap-12">
      {chart.departments.map((dep) => (
        <DepartmentSection key={dep.id ?? "none"} dep={dep} edit={edit} departments={departments} people={people} canEdit={canEdit} />
      ))}
      {chart.unassigned.length > 0 && members ? <Unassigned people={chart.unassigned} canEdit={canEdit} /> : null}
    </div>
  );
}

function DepartmentSection({
  dep,
  edit,
  departments,
  people,
  canEdit,
}: {
  dep: OrgDepartment;
  edit: Parameters<typeof TeamCard>[0]["edit"];
  departments: PickDepartment[];
  people: PickPerson[] | null;
  canEdit: boolean;
}) {
  const headingId = `dep-${dep.id ?? "none"}`;
  const loose = dep.id === null;
  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-start gap-3 border-b border-line pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 id={headingId} className="display text-[24px] leading-tight text-ink-display">
              {dep.name}
            </h2>
            <Chip>{plural(dep.teams.length, "team", "teams")}</Chip>
            {dep.parentName ? <span className="text-[14px] text-ink-3">Part of {dep.parentName}</span> : null}
          </div>
          {loose ? (
            <p className="mt-1.5 max-w-[75ch] text-[15px] leading-relaxed text-ink-3">Teams not filed under a department yet.</p>
          ) : dep.description ? (
            <DescriptionText text={dep.description} label={dep.name} className="mt-1.5 max-w-[75ch] text-[15px] leading-relaxed text-ink-2" />
          ) : (
            <p className="mt-1.5 max-w-[75ch] text-[15px] leading-relaxed text-ink-3">
              {canEdit ? "No description yet. Add one from the menu so agents know what this department owns." : "No description yet."}
            </p>
          )}
        </div>
        {canEdit && dep.id ? (
          <div className="-mr-2 shrink-0">
            <DepartmentMenu
              department={{ id: dep.id, name: dep.name, description: dep.description, parentId: dep.parentId, teamCount: dep.teams.length }}
              departments={departments}
              people={people}
            />
          </div>
        ) : null}
      </div>

      {dep.teams.length === 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-line-2 bg-surface-2 px-4 py-[18px] sm:px-[22px]">
          <p className="text-[14px] text-ink-3">No teams in this department yet.</p>
          {canEdit && dep.id ? <NewTeamButton departments={departments} people={people} defaultDepartmentId={dep.id} variant="outline" label="Add a team" /> : null}
        </div>
      ) : (
        <div className={`mt-5 items-start ${teamGridClass}`}>
          {dep.teams.map((team) => (
            <TeamCard key={team.id} team={team} edit={edit} />
          ))}
        </div>
      )}
    </section>
  );
}

function Unassigned({ people, canEdit }: { people: ChartPerson[]; canEdit: boolean }) {
  return (
    <section aria-labelledby="unassigned-heading">
      <div className="border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 id="unassigned-heading" className="display text-[24px] leading-tight text-ink-display">
            Not on a team
          </h2>
          <Chip>{plural(people.length, "person", "people")}</Chip>
        </div>
        <p className="mt-1.5 max-w-[75ch] text-[15px] leading-relaxed text-ink-3">
          {canEdit
            ? "Their agents know less about their role. Add them to a team with Add a person on its card."
            : "People in the workspace who are on no team yet."}
        </p>
      </div>
      <ul className={`mt-5 ${teamGridClass} !gap-3`}>
        {people.map((p) => (
          <li key={p.id}>
            <Link
              href={`/people/${p.id}`}
              className="group flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-warm-1 transition-colors duration-150 hover:bg-surface-2"
            >
              <Avatar name={p.name} id={p.email} src={p.imageUrl ?? undefined} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{p.name}</span>
                  {p.isYou ? <Chip className="shrink-0">You</Chip> : null}
                </span>
                <span className="block truncate text-[14px] text-ink-3">{p.email}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

