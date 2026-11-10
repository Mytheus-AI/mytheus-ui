import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page, PageHead } from "@/components/ui/Page";

/* Shown in place of a platform-staff console when it cannot be loaded (the ops service is down or
   unreachable, so staff access cannot be confirmed). It shows no workspace data at all, real or
   sample, and says why, calmly, with a way to the workspace admin instead. A signed-in user who
   is not staff never sees this: they get a 404. */
export function PlatformConsoleUnavailable({ title, what, reason }: { title: string; what: string; reason: string }) {
  return (
    <Page width="read">
      <PageHead title={title} context={what} />
      <EmptyState
        art="line"
        title="Not available right now"
        description={reason}
        action={
          <LinkButton href="/workspace" variant="outline">
            Open your workspace
          </LinkButton>
        }
      />
    </Page>
  );
}
