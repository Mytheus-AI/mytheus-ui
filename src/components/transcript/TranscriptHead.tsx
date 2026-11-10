import { LinkButton } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/Page";

/* The transcript's title row on the shared frame: the meeting title in the display serif, one line
   of context, and the way back to the meeting as the page's one action (the topbar breadcrumb
   reads Meetings, the meeting, Transcript; this button is the way back where the breadcrumb is
   hidden, on a phone). No hooks, so the RSC page can render it for the empty state and the client
   reader can render it too. */
export function TranscriptHead({ title, meta, backHref }: { title: string; meta: string; backHref: string }) {
  return (
    <PageHead
      title={title}
      context={meta}
      action={
        <LinkButton href={backHref} variant="outline">
          Open the meeting
        </LinkButton>
      }
    />
  );
}
