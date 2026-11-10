import type { Metadata } from "next";
import { CardFoot, SectionCard } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FieldRow as SettingsRow, TextInput } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
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
const STATE_BADGE: Record<GrantState, { tone: ChipTone; label: string }> = {
  active: { tone: "ok", label: "Active" },
  expired: { tone: "neutral", label: "Expired" },
  revoked: { tone: "neutral", label: "Revoked" },
};
const scopeLabel = (s: string) => GRANT_SCOPES.find((g) => g.value === s)?.label ?? s;

export default async function SupportAccessPage() {
  const [res, directory] = await Promise.all([loadSupportGrants(), listMembers()]);
  const names = new Map((directory ?? []).map((m) => [m.id, m.name]));
  const now = Date.now();
  const grants = res.kind === "live" ? [...res.data].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) : [];

  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Support access"
        context="Mytheus staff cannot see your workspace unless you let them. Access is for one person, for a fixed time, and you can end it early."
      />

      {res.kind === "forbidden" ? (
        <Note tone="error">Only workspace owners and admins can grant support access.</Note>
      ) : res.kind === "unavailable" ? (
        <ErrorState title="Support access could not be loaded" />
      ) : (
        <>
          <SectionCard title="Grant access" headingLevel={2} headingId="grant-heading" description="Use the staff ID from your support conversation. Nobody else can use the grant.">
            <ActionForm action={grantSupportAccess} success="Access granted" className="flex flex-col divide-y divide-line">
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
              <CardFoot className="!border-t-0">
                <FormSubmit variant="primary" size="md" pendingLabel="Granting access">
                  Grant access
                </FormSubmit>
              </CardFoot>
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
                inCard
                art="members"
                title="No grants yet"
                description="Mytheus staff have no access to this workspace."
              />
            ) : (
              <div>
                <table className="mx-table w-full border-collapse text-left text-[14px]">
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
                          <th scope="row" className="max-w-[200px] truncate py-3 pl-[22px] pr-5 text-left text-[14px] font-normal text-ink" title={g.staff_user_id}>
                            {g.staff_user_id}
                          </th>
                          <td data-label="Access" className="px-5 py-3 text-ink-2">
                            {scopeLabel(g.scope)}
                          </td>
                          <td data-label="Granted by" className="px-5 py-3 text-ink-2">
                            {names.get(g.granted_by) ?? "A former member"}
                          </td>
                          <td data-label="Ends" className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">
                            {fmt(g.revoked_at ?? g.expires_at)}
                          </td>
                          <td data-label="Status" className="px-5 py-3">
                            <Chip tone={STATE_BADGE[state].tone}>{STATE_BADGE[state].label}</Chip>
                          </td>
                          <td className="py-3 pl-5 pr-[22px] text-right">
                            {state === "active" ? (
                              <ActionForm action={revokeSupportAccess} success="Access revoked" className="flex flex-wrap items-center gap-2 sm:justify-end">
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
