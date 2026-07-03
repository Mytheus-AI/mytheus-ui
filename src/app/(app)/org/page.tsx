import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { mockDepartments, mockOrgContext } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Org — Mytheus" };

/* The org chart: departments → teams → members, from mock. This is the
   structure agents use to tune role-relevant notes and pick stakeholders. */

export default function OrgPage() {
  const memberCount = mockDepartments
    .flatMap((d) => d.teams)
    .reduce((n, t) => n + t.members.length, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="kicker text-signal">Organization</p>
      <h1 className="display mt-2 text-[clamp(1.8rem,4vw,2.4rem)]">
        {mockOrgContext.org.name}
      </h1>
      <p className="mt-2 text-[14px] text-ink-3">
        {mockDepartments.length} departments · {memberCount} people. Your agents
        read this structure to tune notes to each role and to suggest missing
        stakeholders.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {mockDepartments.map((dep) => (
          <section key={dep.id}>
            <h2 className="flex items-center gap-3 text-[18px] font-medium tracking-tight text-ink-display">
              {dep.name}
              <span className="font-mono text-[11px] tabular-nums text-ink-3">
                {dep.teams.length} team{dep.teams.length === 1 ? "" : "s"}
              </span>
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {dep.teams.map((team) => (
                <Card key={team.id}>
                  <p className="kicker mb-4">{team.name}</p>
                  <ul className="space-y-3">
                    {team.members.map((m) => (
                      <li key={m.name} className="flex items-center gap-3">
                        <Avatar name={m.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-ink">
                            {m.name}
                          </p>
                          <p className="truncate text-[12px] text-ink-3">{m.role}</p>
                        </div>
                        {m.lead && <Badge tone="default">Lead</Badge>}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
