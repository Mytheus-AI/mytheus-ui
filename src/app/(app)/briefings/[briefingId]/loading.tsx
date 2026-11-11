import { BriefingPlayerSkeleton } from "@/components/briefing/BriefingPlayerSkeleton";
import { ButtonBone, Page, TextBone, PageHeadSkeleton } from "@/components/ui/Page";

/* One briefing while it loads, from the page's own frame: the reading width, PageHead's row with
   its small outline button ("Open the meeting"), then the full player. */
export default function Loading() {
  return (
    <Page width="read" label="Loading your briefing">
      <PageHeadSkeleton title="w-52" context={false} actions={<ButtonBone label="Open the meeting" size="sm" />}>
        <TextBone className="mt-2 max-w-[75ch] text-[15px] leading-normal" widths={["w-[440px]"]} narrow={["w-[50%]"]} />
      </PageHeadSkeleton>
      <BriefingPlayerSkeleton />
    </Page>
  );
}
