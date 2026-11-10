import { LockSimple, ShieldCheck, Plugs } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoRow, PageHeader, SectionCard, focusPill } from "@/components/settings/primitives";

/* The platform-staff consoles (every tenant, cost, flags, support) need two things that do not
   exist yet: `admin-ops-service` routes (`/admin/ops/*` serves nothing) and a staff role in the
   session, distinct from a workspace admin. Until both land these screens show no tenant data
   at all, real or sample: a calm empty state that says why, what turns it on, and where a
   workspace admin should go instead. */
export function PlatformConsoleUnavailable({ title, what }: { title: string; what: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={title} description={what} />

      <EmptyState
        className="!bg-surface"
        title="This console is not on yet"
        description="It is for Mytheus platform staff and reads across every workspace, so no workspace data is shown here today."
        action={
          <LinkButton href="/tenant" variant="outline" className={focusPill}>
            Open your workspace admin
          </LinkButton>
        }
      />

      <SectionCard
        title="What turns it on"
        headingLevel={2}
        headingId="turns-on-heading"
        description="Both of these have to exist first."
      >
        <InfoRow icon={<ShieldCheck size={20} />} title="A staff-only role">
          A role in the session that marks Mytheus platform staff, separate from a workspace owner or admin.
        </InfoRow>
        <InfoRow icon={<Plugs size={20} />} title="The ops service">
          The admin and ops routes that read across workspaces.
        </InfoRow>
        <InfoRow icon={<LockSimple size={20} />} title="Until then">
          Workspace owners and admins manage their own team, usage and agent collaboration from workspace admin.
        </InfoRow>
      </SectionCard>
    </div>
  );
}
