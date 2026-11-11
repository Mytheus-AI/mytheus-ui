import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, ChipBone, Page, PageColumns, TextBone, PageHeadSkeleton } from "@/components/ui/Page";

/* A decision's page while it loads, from the page's own frame (without this it would inherit the
   meeting's skeleton): the title row (the decision as the title, its status chip, Open meeting),
   then PageColumns: why it was decided, the lineage thread, the bet and the agreement read in the
   main column; who it reaches and the note beside them. */

export default function Loading() {
  return (
    <Page label="Loading the decision">
      <PageHeadSkeleton title="w-[min(520px,90%)]" titleNarrow={["w-[50%]"]} context={false} actions={<ButtonBone label="Open meeting" icon />}>
        <p className="mt-2 max-w-[75ch] text-[15px] leading-normal">
          <span className="inline-flex flex-wrap items-center gap-2">
            <ChipBone label="Confirmed Nov 10, 3:40 PM UTC" className="pl-[30px]" />
          </span>
        </p>
      </PageHeadSkeleton>

      <PageColumns
        sticky={false}
        aside={
          <div aria-hidden className="flex flex-col gap-5">
            <div className={cardClass({ flush: true })}>
              <CardHeadSkeleton title="w-36" description={["w-[85%]"]} divided />
              <div className="flex flex-col gap-3 px-4 py-[18px] sm:px-[22px]">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Bone className="h-9 w-9 shrink-0" />
                    <TextBone className="flex-1 text-[15px]" widths={["w-[60%]"]} />
                  </div>
                ))}
              </div>
            </div>
            <Bone className="h-[72px] w-full" />
          </div>
        }
      >
        <div aria-hidden className={cardClass({ flush: true })}>
          <CardHeadSkeleton title="w-32" description={["w-[60%]"]} divided />
          <div className="px-4 py-[18px] sm:px-[22px]">
            <TextBone className="text-[15px] leading-relaxed" widths={["w-[94%]", "w-[80%]"]} />
            <Bone className="mt-3 h-[64px] w-full" />
          </div>
        </div>
        <div aria-hidden className={cardClass({ flush: true })}>
          <CardHeadSkeleton title="w-20" description={["w-[70%]"]} className="!pb-4" />
          <div className="border-t border-line px-4 py-5 sm:px-[22px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4 pb-6 last:pb-0">
                <Bone className="h-8 w-8 shrink-0 !rounded-full" />
                <div className="min-w-0 flex-1 pt-1">
                  <TextBone className="text-[15px] leading-snug" widths={[i === 1 ? "w-[70%]" : "w-[52%]"]} />
                  <TextBone className="mt-1 text-[12.5px]" widths={["w-32"]} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden className={cardClass({ flush: true })}>
          <CardHeadSkeleton title="w-44" description={["w-[66%]"]} divided />
          <div className="px-4 py-[18px] sm:px-[22px]">
            <TextBone className="text-[15px] leading-relaxed" widths={["w-[72%]"]} />
          </div>
        </div>
      </PageColumns>
    </Page>
  );
}
