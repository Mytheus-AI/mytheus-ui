import type { Metadata } from "next";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note, PageHeader } from "@/components/settings/primitives";
import { thClass } from "@/components/admin/StatCard";
import { ActionForm } from "@/components/admin/ActionForm";
import { FormSelect } from "@/components/admin/FormSelect";
import { FormSubmit } from "@/components/admin/FormSubmit";
import { WorkspaceInvite } from "@/components/admin/WorkspaceInvite";
import { changeMemberTier, removeMemberAccess } from "@/app/actions/tenant-admin";
import { loadTenantMembers } from "@/lib/api/admin-tenant";
import { listMembers } from "@/lib/api/members";
import { memberControls, type Tier } from "@/lib/tenant-admin";

export const metadata: Metadata = { title: "Members | Mytheus" };
export const dynamic = "force-dynamic";

/* Members with their access tier (Phase P12, plan 3.13 step 2), over admin-ops-service's
   `/admin/tenant/members`, which reuses identity's RBAC code paths and audits every change.
   Names and pictures are joined from the workspace directory (`GET /users`, names from Clerk);
   a person it cannot name is shown by email. Removing access revokes the person's tier: they
   stay in the Clerk organization with no access until an admin grants it again. The server
   refuses the changes that would lock the workspace out (the last owner, for one) and the page
   shows its reason. */

const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];
const tierTone: Record<Tier, "default" | "medium" | "low"> = { owner: "medium", admin: "low", member: "default" };
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function TenantMembersPage() {
  const [res, directory] = await Promise.all([loadTenantMembers(), listMembers()]);
  const byId = new Map((directory ?? []).map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Members"
        description="Owners manage everything, admins manage people and settings, members use the workspace. Every change is written to the audit log."
        actions={<WorkspaceInvite />}
      />

      {res.kind === "forbidden" ? (
        <Note tone="error">Only workspace owners and admins can manage members.</Note>
      ) : res.kind === "unavailable" ? (
        <Note tone="warning">Members could not be loaded from the server just now. Try again in a moment.</Note>
      ) : res.data.length === 0 ? (
        <EmptyState title="No members with access" description="Invite someone to give them access to this workspace." />
      ) : (
        <section aria-label="Members" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead className="hidden md:table-header-group">
              <tr className="bg-bg">
                <th scope="col" className={thClass}>Person</th>
                <th scope="col" className={thClass}>Access</th>
                <th scope="col" className={thClass}>Since</th>
                <th scope="col" className={thClass}>
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {res.data.map((m) => {
                const person = byId.get(m.user_id);
                const name = person?.name ?? m.email.split("@")[0] ?? m.email;
                const isYou = person?.isYou ?? false;
                const controls = memberControls({ isYou });
                const since = m.created_at && !Number.isNaN(Date.parse(m.created_at)) ? date.format(new Date(m.created_at)) : null;
                return (
                  <tr key={m.user_id} className="flex flex-col gap-3 px-4 py-3.5 md:table-row md:px-0 md:py-0">
                    <td className="md:max-w-[340px] md:px-5 md:py-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar name={name} id={m.email} src={person?.imageUrl ?? undefined} size="md" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">
                            {name}
                            {isYou ? <span className="ml-1.5 font-normal text-ink-3">(you)</span> : null}
                          </span>
                          <span className="block truncate text-[12.5px] text-ink-3">{m.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="md:px-5 md:py-3">
                      {controls.canChangeTier ? (
                        <ActionForm action={changeMemberTier} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <FormSelect name="tier" defaultValue={m.tier} options={TIER_OPTIONS} label={`Access for ${name}`} className="w-[130px]" />
                          <FormSubmit pendingLabel="Saving..." ariaLabel={`Save access for ${name}`}>
                            Save
                          </FormSubmit>
                        </ActionForm>
                      ) : (
                        <Badge tone={tierTone[m.tier]} className="capitalize">
                          {m.tier}
                        </Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-[13px] tabular-nums text-ink-3 md:px-5 md:py-3">{since ?? ""}</td>
                    <td className="md:px-5 md:py-3 md:text-right">
                      {controls.canRemove ? (
                        <ActionForm action={removeMemberAccess} className="flex flex-wrap items-center gap-2 md:justify-end">
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <FormSubmit variant="ghost" confirmLabel="Confirm remove" pendingLabel="Removing..." ariaLabel={`Remove access for ${name}`}>
                            Remove access
                          </FormSubmit>
                        </ActionForm>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
      <p className="max-w-[70ch] text-[13px] text-ink-3">
        You cannot change or remove your own access here. Ask another owner, so the workspace always keeps someone who can manage it.
      </p>
    </div>
  );
}
