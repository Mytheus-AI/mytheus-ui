import type { Metadata } from "next";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { theadRowClass, thClass } from "@/components/admin/StatCard";
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
const TIER_CHIP: Record<Tier, ChipTone> = { owner: "accent", admin: "neutral", member: "outline" };
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function TenantMembersPage() {
  const [res, directory] = await Promise.all([loadTenantMembers(), listMembers()]);
  const byId = new Map((directory ?? []).map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Members"
        context="Owners manage everything, admins manage people and settings, members use the workspace. Every change is written to the audit log."
        action={<WorkspaceInvite />}
      />

      {res.kind === "forbidden" ? (
        <Note tone="error">Only workspace owners and admins can manage members.</Note>
      ) : res.kind === "unavailable" ? (
        <ErrorState title="Members could not be loaded" />
      ) : res.data.length === 0 ? (
        <EmptyState art="members" title="No members with access" description="Invite someone to give them access to this workspace." action={<WorkspaceInvite />} />
      ) : (
        <Card as="section" flush aria-label="Members">
          <table className="mx-table w-full border-collapse text-left text-[14px]">
            <caption className="sr-only">Members, their access and since when</caption>
            <thead>
              <tr className={theadRowClass}>
                <th scope="col" className={`${thClass} !pl-[22px]`}>Person</th>
                <th scope="col" className={thClass}>Access</th>
                <th scope="col" className={thClass}>Since</th>
                <th scope="col" className={`${thClass} !pr-[22px]`}>
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
                  <tr key={m.user_id} className="transition-colors duration-150 hover:bg-surface-2">
                    <th scope="row" className="max-w-[360px] py-3 pl-[22px] pr-5 text-left font-normal">
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar name={name} id={m.email} src={person?.imageUrl ?? undefined} size="md" />
                        <span className="min-w-0">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-semibold text-ink">{name}</span>
                            {isYou ? <Chip className="shrink-0">You</Chip> : null}
                          </span>
                          <span className="block truncate text-[14px] text-ink-3">{m.email}</span>
                        </span>
                      </span>
                    </th>
                    <td data-label="Access" className="px-5 py-3">
                      {controls.canChangeTier ? (
                        <ActionForm action={changeMemberTier} success="Access saved" className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <FormSelect name="tier" defaultValue={m.tier} options={TIER_OPTIONS} label={`Access for ${name}`} className="w-[130px]" />
                          <FormSubmit pendingLabel="Saving access" ariaLabel={`Save access for ${name}`}>
                            Save access
                          </FormSubmit>
                        </ActionForm>
                      ) : (
                        <Chip tone={TIER_CHIP[m.tier]} className="capitalize">
                          {m.tier}
                        </Chip>
                      )}
                    </td>
                    <td data-label="Since" className="whitespace-nowrap px-5 py-3 text-[14px] tabular-nums text-ink-3">
                      {since ?? "Not known"}
                    </td>
                    <td className="py-3 pl-5 pr-[22px] text-right">
                      {controls.canRemove ? (
                        <ActionForm action={removeMemberAccess} success="Access removed" className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <FormSubmit destructive confirmLabel="Confirm remove" pendingLabel="Removing access" ariaLabel={`Remove access for ${name}`}>
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
        </Card>
      )}
      <Note>
        You cannot change or remove your own access here. Ask another owner, so the workspace always keeps someone who can
        manage it.
      </Note>
    </div>
  );
}
