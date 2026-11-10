import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/settings/primitives";

/* The platform-staff consoles (every tenant, cost, flags, support) need two things that do not
   exist yet: `admin-ops-service` routes (`/admin/ops/*` serves nothing) and a staff role in the
   session, distinct from a workspace admin. Until both land these screens show no tenant data
   at all, real or sample, and say why. */
export function PlatformConsoleUnavailable({ title, what }: { title: string; what: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={title} description={what} />
      <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-bg-2 text-ink-3">
          <LockSimple size={24} aria-hidden />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-ink">Not available yet</h2>
        <p className="mt-2 max-w-[52ch] text-[13.5px] text-ink-3">
          This console is for Mytheus platform staff and reads across every workspace. It turns on once the ops service
          and a staff-only role exist, so no workspace data is shown here today.
        </p>
        <LinkButton href="/tenant" variant="outline" className="mt-6">
          Open your workspace admin
        </LinkButton>
      </div>
    </div>
  );
}
