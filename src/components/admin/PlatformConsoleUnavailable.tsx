import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, focusPill } from "@/components/settings/primitives";

/* Shown in place of a platform-staff console when it cannot be loaded (the ops service is down or
   unreachable, so staff access cannot be confirmed). It shows no workspace data at all, real or
   sample, and says why, calmly, with a way to the workspace admin instead. A signed-in user who
   is not staff never sees this: they get a 404. */
export function PlatformConsoleUnavailable({ title, what, reason }: { title: string; what: string; reason: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={title} description={what} />
      <EmptyState
        className="!bg-surface"
        title="Not available right now"
        description={reason}
        action={
          <LinkButton href="/workspace" variant="outline" className={focusPill}>
            Open your workspace admin
          </LinkButton>
        }
      />
    </div>
  );
}
