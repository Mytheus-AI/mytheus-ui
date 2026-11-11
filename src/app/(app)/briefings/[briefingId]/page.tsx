import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page, PageHead } from "@/components/ui/Page";
import { LinkButton } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { BriefingPlayer } from "@/components/briefing/BriefingPlayer";
import { fetchBriefing, fetchBriefingSettings } from "@/lib/api/briefings";

export const metadata: Metadata = { title: "Briefing | Mytheus" };
export const dynamic = "force-dynamic";

/* One briefing, where its notification lands: the full player, the meeting a link away. */
export default async function BriefingPage({ params }: { params: { briefingId: string } }) {
  const [read, settings] = await Promise.all([fetchBriefing(params.briefingId), fetchBriefingSettings()]);
  if (read.kind === "missing") notFound();
  const b = read.kind === "live" ? read.data : null;
  return (
    <Page width="read">
      <PageHead
        title="Your briefing"
        context="Only you hear this. Every point opens the moment it came from."
        action={
          b?.meeting_id ? (
            <LinkButton href={`/meetings/${b.meeting_id}`} variant="outline" size="sm">
              Open the meeting
            </LinkButton>
          ) : (
            <LinkButton href="/briefings" variant="outline" size="sm">
              All briefings
            </LinkButton>
          )
        }
      />
      {b ? (
        <BriefingPlayer initial={b} meetingId={b.meeting_id ?? null} canRequest={false} preferences={settings.kind === "live" ? settings.data : null} variant="full" />
      ) : (
        <ErrorState title="This briefing could not be loaded" text="Nothing was lost. It returns when it can be read." />
      )}
    </Page>
  );
}
