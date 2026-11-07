import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/settings/primitives";
import { mockDepartments, mockOrgContext, personSlug } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Org | Mytheus" };

/* The org chart: departments → teams → members, from mock. This is the
   structure agents use to tune role-relevant notes and pick stakeholders. */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function OrgPage() {
  const memberCount = mockDepartments
    .flatMap((d) => d.teams)
    .reduce((n, t) => n + t.members.length, 0);

  return (
    <div className="mx-auto max-w-6xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title={mockOrgContext.org.name}
        description={`${plural(mockDepartments.length, "department", "departments")}, ${plural(memberCount, "person", "people")}. Your agents read this structure to tune notes to each role and to suggest missing stakeholders.`}
      />

      {mockDepartments.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No departments yet"
          description="Teams and the people on them will appear here once your organization is set up."
        />
      ) : (
        <div className="mt-8 flex flex-col gap-9">
          {mockDepartments.map((dep) => {
            const headingId = `dep-${dep.id}`;
            return (
              <section key={dep.id} aria-labelledby={headingId}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 id={headingId} className="display text-[24px] text-ink-display">
                    {dep.name}
                  </h2>
                  <Badge>{plural(dep.teams.length, "team", "teams")}</Badge>
                </div>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  {dep.teams.map((team) => (
                    <article
                      key={team.id}
                      className="overflow-hidden rounded-card border border-line bg-surface shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-[22px] sm:pt-[18px]">
                        <h3 className="text-[16px] font-semibold text-ink">{team.name}</h3>
                        <span className="shrink-0 text-[12.5px] font-semibold text-ink-3">
                          {plural(team.members.length, "member", "members")}
                        </span>
                      </div>
                      <ul className="divide-y divide-line border-t border-line">
                        {team.members.map((m) => (
                          <li key={m.name}>
                            <Link
                              href={`/people/${personSlug(m.name)}`}
                              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg sm:px-[22px]"
                            >
                            <Avatar name={m.name} size="md" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold text-ink">{m.name}</p>
                              <p className="truncate text-[12.5px] text-ink-3">{m.role}</p>
                            </div>
                            {m.lead ? <Badge className="shrink-0">Lead</Badge> : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
