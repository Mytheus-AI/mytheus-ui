import type { Metadata } from "next";
import { SectionCard } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { theadRowClass, thClass } from "@/components/admin/StatCard";
import { AgentCollaborationControl } from "@/components/tenant/AgentCollaborationControl";
import { ApiError } from "@/lib/api/client";
import { listAgentAuthzScopes, type AgentAuthzScope } from "@/lib/api/agent-authz";
import { currentLevel } from "@/lib/agent-collaboration";

export const metadata: Metadata = { title: "Agent collaboration | Mytheus" };

/* Agent collaboration (Phase P10, plan 3.5, mytheus-docs ADR-0013): whether, and how far, one
   person's agent may ask another person's agent for context during a meeting. Owners and admins
   only: the tenant layout hides the console from everyone else, and identity-tenant-service's
   `/api/v1/agent-authz-scopes` enforces the tier on every read and write. A fresh workspace has
   no grants, so collaboration starts Off. Shows the level and the grants behind it. */

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { owner: "Owners", admin: "Admins", member: "Members" };
const CLASS_LABEL: Record<string, string> = {
  meeting_context: "Meeting context",
  decision_lineage: "Decision history",
  action_status: "Action status",
};
const SCOPE_LABEL: Record<string, string> = { self: "Self", same_team: "Same team", department: "Department", org: "Whole org" };
const SCOPE_RANK: Record<string, number> = { self: 0, same_team: 1, department: 2, org: 3 };
const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, member: 2 };

const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

type Load = { ok: true; items: AgentAuthzScope[] } | { ok: false; forbidden: boolean; message: string };

async function load(): Promise<Load> {
  try {
    const { items } = await listAgentAuthzScopes();
    return { ok: true, items: Array.isArray(items) ? items : [] };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return { ok: false, forbidden: true, message: "Only workspace owners and admins can see and change agent collaboration." };
    }
    return { ok: false, forbidden: false, message: "Agent collaboration settings could not be loaded" };
  }
}

export default async function AgentCollaborationPage() {
  const res = await load();
  const rows = res.ok
    ? [...res.items].sort(
        (a, b) =>
          (SCOPE_RANK[a.target_scope] ?? 9) - (SCOPE_RANK[b.target_scope] ?? 9) ||
          (ROLE_RANK[a.grantee_role] ?? 9) - (ROLE_RANK[b.grantee_role] ?? 9) ||
          a.query_class.localeCompare(b.query_class),
      )
    : [];

  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Agent collaboration"
        context="During a meeting, an agent can ask a teammate's agent for context its person is missing. Choose how far that reaches. Every request, allowed or refused, shows in the meeting's collaboration log."
      />

      {res.ok ? (
        <>
          <SectionCard
            title="Who agents may ask"
            headingLevel={2}
            headingId="level-heading"
            description="Applies to everyone in the workspace, whatever their role."
          >
            <AgentCollaborationControl current={currentLevel(rows)} />
          </SectionCard>

          <SectionCard
            title="Current grants"
            headingLevel={2}
            headingId="grants-heading"
            description="The rules behind the setting above. No rule means no access, and a deny rule always wins."
          >
            {rows.length === 0 ? (
              <EmptyState
                inCard
                art="agent"
                title="No grants"
                description="Agents do not ask each other in this workspace. Pick a level above to let them."
              />
            ) : (
              <div>
                <table className="mx-table w-full border-collapse text-left text-[14px]">
                  <caption className="sr-only">Agent collaboration grants</caption>
                  <thead>
                    <tr className={theadRowClass}>
                      <th scope="col" className={`${thClass} !pl-[22px]`}>Who asks</th>
                      <th scope="col" className={thClass}>For</th>
                      <th scope="col" className={thClass}>Reaching</th>
                      <th scope="col" className={thClass}>Rule</th>
                      <th scope="col" className={`${thClass} !pr-[22px]`}>Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={r.id} className="transition-colors duration-150 hover:bg-surface-2">
                        <th scope="row" className="py-3 pl-[22px] pr-5 text-left font-semibold text-ink">
                          {ROLE_LABEL[r.grantee_role] ?? r.grantee_role}
                        </th>
                        <td data-label="For" className="px-5 py-3 text-ink-2">
                          {CLASS_LABEL[r.query_class] ?? r.query_class}
                        </td>
                        <td data-label="Reaching" className="px-5 py-3 text-ink-2">
                          {SCOPE_LABEL[r.target_scope] ?? r.target_scope}
                        </td>
                        <td data-label="Rule" className="px-5 py-3">
                          <Chip tone={r.effect === "deny" ? "high" : "ok"}>{r.effect === "deny" ? "Deny" : "Allow"}</Chip>
                        </td>
                        <td data-label="Since" className="whitespace-nowrap py-3 pl-5 pr-[22px] tabular-nums text-ink-3">
                          {date.format(new Date(r.created_at))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        res.forbidden ? <Note tone="error">{res.message}</Note> : <ErrorState title={res.message} />
      )}
    </div>
  );
}
