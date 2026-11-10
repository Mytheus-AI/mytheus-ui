import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Note, PageHeader, SectionCard } from "@/components/settings/primitives";
import { thClass } from "@/components/admin/StatCard";
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

type Load = { ok: true; items: AgentAuthzScope[] } | { ok: false; message: string };

async function load(): Promise<Load> {
  try {
    const { items } = await listAgentAuthzScopes();
    return { ok: true, items: Array.isArray(items) ? items : [] };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return { ok: false, message: "Only workspace owners and admins can see and change agent collaboration." };
    }
    return { ok: false, message: "Agent collaboration settings could not be loaded just now. Try again in a moment." };
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
    <div className="flex flex-col gap-8 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Agent collaboration"
        description="During a meeting, an agent can ask a teammate's agent for context its person is missing. Choose how far that reaches. Every request, allowed or refused, shows in the meeting's collaboration log."
      />

      {res.ok ? (
        <>
          <SectionCard title="Who agents may ask" description="Applies to everyone in the workspace, whatever their role.">
            <AgentCollaborationControl current={currentLevel(rows)} />
          </SectionCard>

          <section aria-labelledby="grants-heading" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
            <div className="px-4 pb-3 pt-4 sm:px-[22px] sm:pt-[18px]">
              <h2 id="grants-heading" className="text-[16px] font-semibold text-ink">
                Current grants
              </h2>
              <p className="mt-0.5 text-[13.5px] text-ink-3">
                The rules behind the setting above. No rule means no access; a deny rule always wins.
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="border-t border-line px-4 py-4 text-[13.5px] text-ink-3 sm:px-[22px]">
                No grants. Agents do not ask each other in this workspace.
              </p>
            ) : (
              <>
                <table className="hidden w-full border-collapse border-t border-line text-left text-[14px] md:table">
                  <thead>
                    <tr className="bg-bg">
                      <th scope="col" className={thClass}>Who asks</th>
                      <th scope="col" className={thClass}>For</th>
                      <th scope="col" className={thClass}>Reaching</th>
                      <th scope="col" className={thClass}>Rule</th>
                      <th scope="col" className={thClass}>Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={r.id} className={r.effect === "deny" ? "bg-priority-high-soft" : undefined}>
                        <td className="px-5 py-3 text-ink">{ROLE_LABEL[r.grantee_role] ?? r.grantee_role}</td>
                        <td className="px-5 py-3 text-ink-2">{CLASS_LABEL[r.query_class] ?? r.query_class}</td>
                        <td className="px-5 py-3 text-ink-2">{SCOPE_LABEL[r.target_scope] ?? r.target_scope}</td>
                        <td className="px-5 py-3">
                          <Badge tone={r.effect === "deny" ? "danger" : "success"}>{r.effect === "deny" ? "Deny" : "Allow"}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">{date.format(new Date(r.created_at))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="divide-y divide-line border-t border-line md:hidden">
                  {rows.map((r) => (
                    <li key={r.id} className={`flex items-center justify-between gap-3 px-4 py-3 text-[13.5px] ${r.effect === "deny" ? "bg-priority-high-soft" : ""}`}>
                      <span className="min-w-0 text-ink-2">
                        <span className="font-semibold text-ink">{ROLE_LABEL[r.grantee_role] ?? r.grantee_role}</span> &middot;{" "}
                        {CLASS_LABEL[r.query_class] ?? r.query_class} &middot; {SCOPE_LABEL[r.target_scope] ?? r.target_scope}
                      </span>
                      <Badge tone={r.effect === "deny" ? "danger" : "success"} className="shrink-0">
                        {r.effect === "deny" ? "Deny" : "Allow"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      ) : (
        <Note tone="error">{res.message}</Note>
      )}
    </div>
  );
}
