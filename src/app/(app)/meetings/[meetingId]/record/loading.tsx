import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, Page, PageGrid, TextBone, PageHeadSkeleton } from "@/components/ui/Page";

/* What is recorded, while it loads, from the page's own frame (without this it would inherit the
   meeting's skeleton): the title row with Open the meeting, then PageGrid's two cards, your consent
   receipt and the off-the-record stretches (the cards are padded Cards with a divided head, as on
   the page). */

export default function Loading() {
  return (
    <Page label="Loading what is recorded">
      <PageHeadSkeleton title="w-64" context={false} actions={<ButtonBone label="Open the meeting" />}>
        <TextBone className="mt-2 max-w-[75ch] text-[15px] leading-normal" widths={["w-[580px]"]} narrow={["w-[60%]", "w-[40%]"]} />
      </PageHeadSkeleton>
      <PageGrid cols={2}>
        <div aria-hidden className={cardClass()}>
          <CardHeadSkeleton title="w-28" description={["w-36"]} divided />
          <div className="px-4 pb-[18px] sm:px-[22px]">
            <div className="mt-4 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Bone className="h-5 w-5 shrink-0 !rounded-full" />
                  <TextBone className="flex-1 text-[15px] leading-normal" widths={[i % 2 ? "w-[70%]" : "w-[88%]"]} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div aria-hidden className={cardClass()}>
          <CardHeadSkeleton title="w-32" description={["w-40"]} divided />
          <div className="px-4 pb-[18px] sm:px-[22px]">
            <div className="mt-4 grid gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-start gap-3 rounded-ctl bg-surface-2 px-3.5 py-3">
                  <Bone className="mt-0.5 h-[18px] w-[18px] shrink-0 !rounded-full" />
                  <div className="min-w-0 flex-1">
                    <TextBone className="text-[15px] font-semibold" widths={["w-[60%]"]} />
                    <TextBone className="text-[14px]" widths={["w-[85%]"]} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageGrid>
    </Page>
  );
}
