import { BriefingPlayerSkeleton } from "@/components/briefing/BriefingPlayerSkeleton";
import { cardClass, cardPadX } from "@/components/ui/Card";
import { CardHeadSkeleton, ChipBone, Page, PageHeadSkeleton, TextBone } from "@/components/ui/Page";

/* Your briefings while they load, from the page's own frame: the title row, then its grid (the
   full player in the main column, "Earlier briefings" in the 340px and 360px side column). */
export default function Loading() {
  return (
    <Page label="Loading your briefings">
      <PageHeadSkeleton title="w-64" context={["w-[96%]", "w-[30%]"]} narrow={["w-[60%]"]} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="min-w-0">
          <BriefingPlayerSkeleton ask />
        </div>
        <div aria-hidden className="min-w-0">
          <div className={cardClass({ flush: true })}>
            <CardHeadSkeleton title="w-40" divided />
            <div className="divide-y divide-line">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`flex items-center justify-between gap-3 py-3 ${cardPadX}`}>
                  <span className="min-w-0 flex-1">
                    <TextBone className="text-[15px] font-semibold" widths={["w-[80%]"]} />
                    <TextBone className="text-[13.5px]" widths={["w-28"]} />
                  </span>
                  <ChipBone label="2:40" />
                </div>
              ))}
            </div>
            <TextBone className={`border-t border-line py-3 text-[14px] ${cardPadX}`} widths={["w-[85%]"]} narrow={[]} />
          </div>
        </div>
      </div>
    </Page>
  );
}
