import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/settings/primitives";

/* Shown in place of a platform-staff console when it cannot be loaded (the ops service is down or
   unreachable, so staff access cannot be confirmed). It shows no workspace data at all, real or
   sample, and says why. A signed-in user who is not staff never sees this: they get a 404. */
export function PlatformConsoleUnavailable({ title, what, reason }: { title: string; what: string; reason: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={title} description={what} />
      <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-bg-2 text-ink-3">
          <LockSimple size={24} aria-hidden />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-ink">Not available right now</h2>
        <p className="mt-2 max-w-[52ch] text-[13.5px] text-ink-3">{reason}</p>
        <LinkButton href="/tenant" variant="outline" className="mt-6">
          Open your workspace admin
        </LinkButton>
      </div>
    </div>
  );
}
