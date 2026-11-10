import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note, PageHeader, SectionCard, SettingsRow, TextInput } from "@/components/settings/primitives";
import { theadRowClass, thClass } from "@/components/admin/StatCard";
import { ActionForm } from "@/components/admin/ActionForm";
import { FormSelect } from "@/components/admin/FormSelect";
import { FormSubmit } from "@/components/admin/FormSubmit";
import { grantSupportAccess, revokeSupportAccess } from "@/app/actions/tenant-admin";
import { loadSupportGrants } from "@/lib/api/admin-tenant";
import { listMembers } from "@/lib/api/members";
import { GRANT_DURATIONS, GRANT_SCOPES, grantState, type GrantState } from "@/lib/tenant-admin";

export const metadata: Metadata = { title: "Support access | Mytheus" };
export const dynamic = "force-dynamic";

/* Support access (Phase P12, plan 3.13, `support_grants`): Mytheus staff have no standing access
   to a workspace. An owner or admin grants it here, to one staff member, for a fixed time, and can
   revoke it at any moment. Every grant, revoke and staff action under it is audited. */

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? dateTime.format(new Date(iso)) : "");
const STATE_BADGE: Record<GrantState, { tone: "success" | "default"; label: string }> = {
  active: { tone: "success", label: "Active" },
  expired: { tone: "default", label: "Expired" },
  revoked: { tone: "default", label: "Revoked" },
};
const scopeLabel = (s: string) => GRANT_SCOPES.find((g) => g.value === s)?.label ?? s;

export default async function SupportAccessPage() {
  const [res, directory] = await Promise.all([loadSupportGrants(), listMembers()]);
  const names = new Map((directory ?? []).map((m) => [m.id, m.name]));
  const now = Date.now();
  const grants = res.kind === "live" ? [...res.data].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Support access"
        description="Mytheus staff cannot see your workspace unless you let them. Access is for one person, for a fixed time, and you can end it early."
      />

      {res.kind === "forbidden" ? (
        <Note tone="error">Only workspace owners and admins can grant support access.</Note>
      ) : res.kind === "unavailable" ? (
        <Note tone="warning">Support access could not be loaded from the server just now. Try again in a moment.</Note>
      ) : (
        <>
          <SectionCard title="Grant access" headingLevel={2} headingId="grant-heading" description="Use the staff ID from your support conversation. Nobody else can use the grant.">
            <ActionForm action={grantSupportAccess} className="flex flex-col" messageClassName="px-4 pb-4 sm:px-[22px]">
              <SettingsRow label="Staff ID" htmlFor="staff_user_id" help="The ID support gave you, pasted exactly.">
                <TextInput
                  id="staff_user_id"
                  name="staff_user_id"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="font-mono"
                />
              </SettingsRow>
              <SettingsRow label="What support may do" help={GRANT_SCOPES.map((s) => `${s.label}: ${s.help}`).join(" ")}>
                <FormSelect name="scope" defaultValue="read_only" options={GRANT_SCOPES.map((s) => ({ value: s.value, label: s.label }))} label="What support may do" size="md" />
              </SettingsRow>
              <SettingsRow label="Ends after" help="Access ends on its own. You can revoke it sooner.">
                <FormSelect
                  name="hours"
                  defaultValue="24"
                  options={GRANT_DURATIONS.map((d) => ({ value: String(d.hours), label: d.label }))}
                  label="Ends after"
                  size="md"
                />
              </SettingsRow>
              <div className="border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
                <FormSubmit variant="primary" size="md" pendingLabel="Granting access">
                  Grant access
                </FormSubmit>
              </div>
            </ActionForm>
          </SectionCard>

          <SectionCard
            title="Grants"
            headingLevel={2}
            headingId="grants-heading"
            description="Current and past grants for this workspace."
          >
            {grants.length === 0 ? (
              <EmptyState
                className="!rounded-none !border-0 !bg-transparent !py-10"
                title="No grants yet"
                description="Mytheus staff have no access to this workspace."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-[14.5px]">
                  <caption className="sr-only">Support access grants</caption>
                  <thead>
                    <tr className={theadRowClass}>
                      <th scope="col" className={`${thClass} !pl-[22px]`}>Staff ID</th>
                      <th scope="col" className={thClass}>Access</th>
                      <th scope="col" className={thClass}>Granted by</th>
                      <th scope="col" className={thClass}>Ends</th>
                      <th scope="col" className={thClass}>Status</th>
                      <th scope="col" className={`${thClass} !pr-[22px]`}>
                        <span className="sr-only">Revoke</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {grants.map((g) => {
                      const state = grantState(g, now);
                      return (
                        <tr key={g.id} className="transition-colors duration-150 hover:bg-surface-2">
                          <td className="max-w-[200px] truncate py-3 pl-[22px] pr-5 font-mono text-[13.5px] text-ink" title={g.staff_user_id}>
                            {g.staff_user_id}
                          </td>
                          <td className="px-5 py-3 text-ink-2">{scopeLabel(g.scope)}</td>
                          <td className="px-5 py-3 text-ink-2">{names.get(g.granted_by) ?? "A former member"}</td>
                          <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">{fmt(g.revoked_at ?? g.expires_at)}</td>
                          <td className="px-5 py-3">
                            <Badge tone={STATE_BADGE[state].tone}>{STATE_BADGE[state].label}</Badge>
                          </td>
                          <td className="py-3 pl-5 pr-[22px] text-right">
                            {state === "active" ? (
                              <ActionForm action={revokeSupportAccess} className="flex flex-wrap items-center justify-end gap-2">
                                <input type="hidden" name="grant_id" value={g.id} />
                                <FormSubmit
                                  destructive
                                  confirmLabel="Confirm revoke"
                                  pendingLabel="Revoking"
                                  ariaLabel={`Revoke access for ${g.staff_user_id}`}
                                >
                                  Revoke
                                </FormSubmit>
                              </ActionForm>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
